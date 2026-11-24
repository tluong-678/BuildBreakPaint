
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
import { useLanguage } from "@/lib/i18n/LanguageProvider";
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

type TranslationLanguage = "en" | "vi" | "zh";

const ROOM = "public-lobby";

const starterBlocks: BlockData[] = [
  { id: "starter-1", x: 0, y: 0, z: 0, color: "#e9a23b" },
  { id: "starter-2", x: 1, y: 0, z: 0, color: "#4b9bd8" },
  { id: "starter-3", x: 0, y: 1, z: 0, color: "#72b86b" },
];

export default function MultiplayerClient() {
  const { t } = useLanguage();

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

  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translationLanguage, setTranslationLanguage] =
    useState<TranslationLanguage>("vi");
  const [translatedMessages, setTranslatedMessages] =
    useState<Record<string, string>>({});
  const [translationErrors, setTranslationErrors] =
    useState<Record<string, boolean>>({});

  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerIdRef = useRef("");
  const blocksRef = useRef(blocks);
  const playtimeSecondsRef = useRef(0);

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

  // Tải bản đồ chung từ server.
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
          blocksRef.current = data.world.blocks;
        }
      })
      .catch(() => {
        setConnection("Could not load shared world");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime presence, chat, block map, player movement.
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
      const incoming = payload as ChatMessage;

      if (!incoming?.id || !incoming.text) return;

      setMessages((old) => {
        if (old.some((item) => item.id === incoming.id)) {
          return old;
        }

        return [...old, incoming].slice(-100);
      });
    });

    channel.on("broadcast", { event: "world" }, ({ payload }) => {
      const incoming = payload as WorldData;

      if (
        incoming?.version === 1 &&
        Array.isArray(incoming.blocks)
      ) {
        setBlocks(incoming.blocks);
        blocksRef.current = incoming.blocks;
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

  // Gửi vị trí nhân vật qua realtime.
  const sendPlayerPosition = useCallback(
    (position: { x: number; y: number; z: number }) => {
      const channel = channelRef.current;
      if (!channel) return;

      void channel.send({
        type: "broadcast",
        event: "player",
        payload: {
          id: playerIdRef.current,
          username,
          ...position,
        },
      });
    },
    [username]
  );

  // Lưu và phát bản đồ chung.
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

      const response = await fetch("/api/multiplayer/world", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room: ROOM,
          world,
        }),
      });

      if (!response.ok) {
        setConnection("World save failed");
      }
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

    if (
      blocksRef.current.some(
        (block) =>
          block.x === x &&
          block.y === y &&
          block.z === z
      )
    ) {
      return;
    }

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

    if (
      blocksRef.current.some(
        (block) =>
          block.x === x &&
          block.y === y &&
          block.z === z
      )
    ) {
      return;
    }

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

  // Chat: gửi nguyên văn; bản dịch chỉ hiển thị riêng ở máy người nhận.
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

    setMessages((old) => [...old, message].slice(-100));

    await channelRef.current.send({
      type: "broadcast",
      event: "chat",
      payload: message,
    });

    setDraft("");
  }

  // Tự dịch tin nhắn mới khi bật Auto Translate.
  useEffect(() => {
    if (!autoTranslate) return;

    let cancelled = false;

    async function translatePending() {
      for (const message of messages) {
        if (
          translatedMessages[message.id] ||
          translationErrors[message.id]
        ) {
          continue;
        }

        try {
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: message.text,
              target: translationLanguage,
              source: "auto",
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.translatedText) {
            throw new Error("Translation failed");
          }

          if (!cancelled) {
            setTranslatedMessages((old) => ({
              ...old,
              [message.id]: data.translatedText,
            }));
          }
        } catch {
          if (!cancelled) {
            setTranslationErrors((old) => ({
              ...old,
              [message.id]: true,
            }));
          }
        }
      }
    }

    void translatePending();

    return () => {
      cancelled = true;
    };
  }, [
    autoTranslate,
    messages,
    translationLanguage,
    translatedMessages,
    translationErrors,
  ]);

  // Ghi nhận thời gian chơi theo từng phút.
  useEffect(() => {
    const timer = window.setInterval(() => {
      playtimeSecondsRef.current += 60;

      void fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seconds: 60,
          username,
        }),
      }).catch(() => {});
    }, 60000);

    return () => window.clearInterval(timer);
  }, [username]);

  const connectionText =
    connection === "SUBSCRIBED"
      ? "🟢 Online"
      : connection === "Connecting…"
        ? t("connecting")
        : connection;

  return (
    <main className={styles.multiPage}>
      <header className={styles.top}>
        <a href="/game">← {t("backToGame")}</a>
        <h1>{t("multiplayer")}</h1>
        <span>{connectionText}</span>
      </header>

      <section className={styles.stage}>
        <GameCanvas
          blocks={blocks}
          onBlockClick={blockClick}
          onGroundClick={groundClick}
          direction={direction}
          jumpSignal={jumpSignal}
          fov={55}
          onPosition={sendPlayerPosition}
          otherPlayers={players}
          username={username}
        />

        <MobileControls
          onMove={(x, z) => setDirection({ x, z })}
          onJump={() => setJumpSignal((value) => value + 1)}
        />
      </section>

      <nav className={styles.toolbar}>
        {(["build", "break", "paint"] as Tool[]).map((item) => (
          <button
            key={item}
            className={tool === item ? styles.active : ""}
            onClick={() => setTool(item)}
          >
            {item === "build"
              ? t("buildTool")
              : item === "break"
                ? t("breakTool")
                : t("paintTool")}
          </button>
        ))}

        <label className={styles.color}>
          {t("color")}
          <input
            type="color"
            value={paint}
            onChange={(event) => setPaint(event.target.value)}
          />
        </label>
      </nav>

      <section className={styles.multiGrid}>
        <div className={styles.roomCard}>
          <h2>{t("publicWorld")}</h2>
          <p>{t("sharedWorldHelp")}</p>

          <h3>
            {t("playersOnline")} ({players.length + 1})
          </h3>

          <p>🟢 {username} ({t("you")})</p>

          {players.map((player) => (
            <p key={player.id}>🟢 {player.username}</p>
          ))}
        </div>

        <div className={styles.chatCard}>
          <h2>{t("liveChat")}</h2>

          <div className={styles.translationControls}>
            <label>
              <input
                type="checkbox"
                checked={autoTranslate}
                onChange={(event) =>
                  setAutoTranslate(event.target.checked)
                }
              />
              Auto translate
            </label>

            <select
              value={translationLanguage}
              onChange={(event) =>
                setTranslationLanguage(
                  event.target.value as TranslationLanguage
                )
              }
              aria-label="Translation language"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <div className={styles.chatMessages}>
            {messages.map((message) => (
              <p key={message.id}>
                <b>{message.username}:</b>{" "}
                {autoTranslate
                  ? translatedMessages[message.id] ??
                    `${message.text} (translating…)`
                  : message.text}
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
              placeholder={t("messagePlaceholder")}
            />

            <button onClick={() => void sendChat()}>
              {t("send")}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
