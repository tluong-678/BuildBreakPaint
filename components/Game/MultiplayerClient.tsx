"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BlockData, Tool, WorldData } from "./types";
import MobileControls from "./MobileControls";
import { createBrowserSupabase } from "@/lib/supabase/client";
import styles from "./Game.module.css";

const GameCanvas = dynamic(() => import("./GameCanvas"), {
  ssr: false,
});

type ChatMessage = {
  id: string;
  username: string;
  text: string;
  sentAt: string;
};

type PlayerState = {
  id: string;
  username: string;
  x: number;
  y: number;
  z: number;
};

const ROOM = "public-lobby";

const starterBlocks: BlockData[] = [
  { id: "starter-1", x: 0, y: 0, z: 0, color: "#e9a23b" },
  { id: "starter-2", x: 1, y: 0, z: 0, color: "#4b9bd8" },
  { id: "starter-3", x: 0, y: 1, z: 0, color: "#72b86b" },
];

export default function MultiplayerClient() {
  const [username, setUsername] = useState("Player");
  const [blocks, setBlocks] = useState<BlockData[]>(starterBlocks);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [connection, setConnection] = useState("Connecting…");
  const [tool, setTool] = useState<Tool>("build");
  const [paint, setPaint] = useState("#ff4d6d");
  const [direction, setDirection] = useState({ x: 0, z: 0 });
  const [jumpSignal, setJumpSignal] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerIdRef = useRef("");
  const blocksRef = useRef(blocks);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    playerIdRef.current = crypto.randomUUID();

    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        if (data.user) {
          setUsername(
            data.user.username ||
              data.user.email?.split("@")[0] ||
              "Player"
          );
        }
      })
      .catch(() => {});
  }, []);

  // Tải thế giới chung đã lưu trên Supabase.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/multiplayer/world?room=${ROOM}`)
      .then((response) => response.json())
      .then((data) => {
        if (
          !cancelled &&
          data.world?.version === 1 &&
          Array.isArray(data.world.blocks)
        ) {
          setBlocks(data.world.blocks);
        }
      })
      .catch(() => {
        setConnection("Could not load shared world");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime: presence, chat, block updates, player positions.
  useEffect(() => {
    let supabase;

    try {
      supabase = createBrowserSupabase();
    } catch {
      setConnection("Supabase not configured");
      return;
    }

    const channel = supabase.channel(`room:${ROOM}`, {
      config: {
        presence: {
          key: playerIdRef.current,
        },
        broadcast: {
          self: false,
        },
      },
    });

    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{
        username: string;
        x?: number;
        y?: number;
        z?: number;
      }>();

      const entries = Object.entries(state).flatMap(
        ([key, values]) =>
          values.map((value) => ({
            id: key,
            username: value.username || "Player",
            x: value.x ?? 3,
            y: value.y ?? 1,
            z: value.z ?? 3,
          }))
      );

      setPlayers(
        entries.filter(
          (player) => player.id !== playerIdRef.current
        )
      );
    });

    channel.on("broadcast", { event: "chat" }, ({ payload }) => {
      setMessages((old) =>
        [...old, payload as ChatMessage].slice(-100)
      );
    });

    channel.on("broadcast", { event: "world" }, ({ payload }) => {
      const incoming = payload as WorldData;

      if (
        incoming?.version === 1 &&
        Array.isArray(incoming.blocks)
      ) {
        setBlocks(incoming.blocks);
      }
    });

    channel.on("broadcast", { event: "player" }, ({ payload }) => {
      const player = payload as PlayerState;

      if (!player?.id || player.id === playerIdRef.current) {
        return;
      }

      setPlayers((old) => {
        const exists = old.some((item) => item.id === player.id);

        if (exists) {
          return old.map((item) =>
            item.id === player.id ? player : item
          );
        }

        return [...old, player];
      });
    });

    channel.subscribe(async (status) => {
      setConnection(status);

      if (status === "SUBSCRIBED") {
        await channel.track({
          username,
          x: 3,
          y: 1,
          z: 3,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [username]);

  // Lưu block vào database và gửi realtime cho người trong phòng.
  const broadcastWorld = useCallback(
    async (nextBlocks: BlockData[]) => {
      const world: WorldData = {
        version: 1,
        blocks: nextBlocks,
      };

      await channelRef.current?.send({
        type: "broadcast",
        event: "world",
        payload: world,
      });

      await fetch("/api/multiplayer/world", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room: ROOM,
          world,
        }),
      });
    },
    []
  );

  const updateBlocks = useCallback(
    (next: BlockData[]) => {
      setBlocks(next);
      blocksRef.current = next;
      void broadcastWorld(next);
    },
    [broadcastWorld]
  );

  function blockClick(
    id: string,
    normal: [number, number, number]
  ) {
    const selected = blocksRef.current.find(
      (block) => block.id === id
    );

    if (!selected) return;

    if (tool === "break") {
      updateBlocks(
        blocksRef.current.filter((block) => block.id !== id)
      );
      return;
    }

    if (tool === "paint") {
      updateBlocks(
        blocksRef.current.map((block) =>
          block.id === id
            ? { ...block, color: paint }
            : block
        )
      );
      return;
    }

    const x = selected.x + normal[0];
    const y = selected.y + normal[1];
    const z = selected.z + normal[2];

    const occupied = blocksRef.current.some(
      (block) =>
        block.x === x &&
        block.y === y &&
        block.z === z
    );

    if (occupied) return;

    updateBlocks([
      ...blocksRef.current,
      {
        id: crypto.randomUUID(),
        x,
        y,
        z,
        color: paint,
      },
    ]);
  }

  function groundClick([x, y, z]: [number, number, number]) {
    if (tool !== "build") return;

    const occupied = blocksRef.current.some(
      (block) =>
        block.x === x &&
        block.y === y &&
        block.z === z
    );

    if (occupied) return;

    updateBlocks([
      ...blocksRef.current,
      {
        id: crypto.randomUUID(),
        x,
        y,
        z,
        color: paint,
      },
    ]);
  }

  async function sendChat() {
    const text = draft.trim().slice(0, 250);

    if (!text || !channelRef.current) return;

    const filtered = text.replace(
      /\b(fuck|shit|bitch|địt|đụ|lồn|cặc)\b/gi,
      "***"
    );

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      username,
      text: filtered,
      sentAt: new Date().toISOString(),
    };

    setMessages((old) =>
      [...old, message].slice(-100)
    );

    await channelRef.current.send({
      type: "broadcast",
      event: "chat",
      payload: message,
    });

    setDraft("");
  }

  return (
    <main className={styles.multiPage}>
      <header className={styles.top}>
        <a href="/game">← Back to game</a>
        <h1>Multiplayer</h1>
        <span>{connection}</span>
      </header>

      <section className={styles.stage}>
        <GameCanvas
          blocks={blocks}
          onBlockClick={blockClick}
          onGroundClick={groundClick}
          direction={direction}
          jumpSignal={jumpSignal}
          fov={55}
        />

        <MobileControls
          onMove={(x, z) => {
            setDirection({ x, z });
          }}
          onJump={() => {
            setJumpSignal((value) => value + 1);
          }}
        />
      </section>

      <nav className={styles.toolbar}>
        {(["build", "break", "paint"] as Tool[]).map(
          (item) => (
            <button
              key={item}
              className={tool === item ? styles.active : ""}
              onClick={() => setTool(item)}
            >
              {item.toUpperCase()}
            </button>
          )
        )}

        <label className={styles.color}>
          Color
          <input
            type="color"
            value={paint}
            onChange={(event) => setPaint(event.target.value)}
          />
        </label>
      </nav>

      <section className={styles.multiGrid}>
        <div className={styles.roomCard}>
          <h2>Public world</h2>
          <p>Everyone in this room edits the same map.</p>

          <h3>Players online ({players.length + 1})</h3>
          <p>🟢 {username} (you)</p>

          {players.map((player) => (
            <p key={player.id}>
              🟢 {player.username}
            </p>
          ))}
        </div>

        <div className={styles.chatCard}>
          <h2>Live chat</h2>

          <div className={styles.chatMessages}>
            {messages.map((message) => (
              <p key={message.id}>
                <b>{message.username}:</b> {message.text}
              </p>
            ))}
          </div>

          <div className={styles.chatInput}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void sendChat();
                }
              }}
              placeholder="Type a message…"
            />

            <button onClick={() => void sendChat()}>
              Send
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
