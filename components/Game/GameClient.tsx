
"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BlockData, Tool, WorldData } from "./types";
import MobileControls from "./MobileControls";
import styles from "./Game.module.css";

const GameCanvas = dynamic(() => import("./GameCanvas"), {
  ssr: false,
});

const starterBlocks: BlockData[] = [
  { id: "starter-1", x: 0, y: 0, z: 0, color: "#e9a23b" },
  { id: "starter-2", x: 1, y: 0, z: 0, color: "#4b9bd8" },
  { id: "starter-3", x: 0, y: 1, z: 0, color: "#72b86b" },
];

type SaveItem = {
  id: string;
  name: string;
  type: string;
  created_at: string;
};

type LeaderboardItem = {
  username: string;
  seconds_played: number;
};

type Panel =
  | "none"
  | "menu"
  | "save"
  | "load"
  | "camera"
  | "leaderboards";

function formatPlaytime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export default function GameClient() {
  const [blocks, setBlocks] = useState<BlockData[]>(starterBlocks);
  const [tool, setTool] = useState<Tool>("build");
  const [paint, setPaint] = useState("#ff4d6d");
  const [saveName, setSaveName] = useState("My world");

  const [panel, setPanel] = useState<Panel>("none");
  const [saves, setSaves] = useState<SaveItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [fov, setFov] = useState(55);
  const [portrait, setPortrait] = useState(false);

  const [direction, setDirection] = useState({ x: 0, z: 0 });
  const [jumpSignal, setJumpSignal] = useState(0);
  const lastSaved = useRef("");

  const world = useMemo<WorldData>(
    () => ({ version: 1, blocks }),
    [blocks]
  );

  const enterImmersive = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser may not support fullscreen.
    }

    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };

      await orientation.lock?.("landscape");
    } catch {
      // Orientation lock is not supported in every browser.
    }
  }, []);

  const exitImmersive = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen errors.
    }
  }, []);

  useEffect(() => {
    const updateDisplay = () => {
      setPortrait(
        window.matchMedia("(orientation: portrait)").matches
      );
    };

    updateDisplay();
    window.addEventListener("resize", updateDisplay);

    return () => {
      window.removeEventListener("resize", updateDisplay);
    };
  }, []);

  const save = useCallback(
    async (type: "manual" | "auto" | "exit" = "manual") => {
      const response = await fetch("/api/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:
            type === "manual"
              ? saveName.trim() || "My world"
              : `${type === "auto" ? "Auto save" : "Exit save"} · ${new Date().toLocaleString()}`,
          type,
          world,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Save failed");
      }

      lastSaved.current = JSON.stringify(world);
      return data;
    },
    [saveName, world]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (JSON.stringify(world) !== lastSaved.current) {
        save("auto")
          .then(() => setMessage("Auto-saved"))
          .catch((error) => setMessage(error.message));
      }
    }, 30000);

    return () => window.clearInterval(timer);
  }, [save, world]);

  useEffect(() => {
    function onVisibility() {
      if (
        document.visibilityState !== "hidden" ||
        JSON.stringify(world) === lastSaved.current
      ) {
        return;
      }

      const payload = new Blob(
        [
          JSON.stringify({
            name: "Exit save",
            type: "exit",
            world,
          }),
        ],
        { type: "application/json" }
      );

      navigator.sendBeacon("/api/saves", payload);
    }

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [world]);

  async function refreshSaves() {
    const response = await fetch("/api/saves");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load saves");
    }

    setSaves(data.saves ?? []);
  }

  async function refreshLeaderboard() {
    setLeaderboardLoading(true);

    try {
      const response = await fetch("/api/leaderboard");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Leaderboard unavailable");
      }

      setLeaderboard(data.players ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Leaderboard unavailable"
      );
    } finally {
      setLeaderboardLoading(false);
    }
  }

  async function loadSave(id: string) {
    const response = await fetch(`/api/saves/${id}/load`, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Load failed");
      return;
    }

    const loadedWorld = data.save.world;
    setBlocks(loadedWorld.blocks);
    lastSaved.current = JSON.stringify(loadedWorld);
    setPanel("none");
    setMessage("World loaded");
  }

  function blockClick(
    id: string,
    normal: [number, number, number]
  ) {
    const selected = blocks.find((block) => block.id === id);
    if (!selected) return;

    if (tool === "break") {
      setBlocks((old) => old.filter((block) => block.id !== id));
      return;
    }

    if (tool === "paint") {
      setBlocks((old) =>
        old.map((block) =>
          block.id === id ? { ...block, color: paint } : block
        )
      );
      return;
    }

    const x = selected.x + normal[0];
    const y = selected.y + normal[1];
    const z = selected.z + normal[2];

    if (blocks.some((block) => block.x === x && block.y === y && block.z === z)) {
      return;
    }

    setBlocks((old) => [
      ...old,
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

    if (blocks.some((block) => block.x === x && block.y === y && block.z === z)) {
      return;
    }

    setBlocks((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        x,
        y,
        z,
        color: paint,
      },
    ]);
  }

  function resetWorld() {
    if (!window.confirm("Reset this world?")) return;

    setBlocks(starterBlocks);
    setMessage("World reset");
    setPanel("none");
  }

  return (
    <main className={styles.game}>
      <div className={styles.gameViewport}>
        <GameCanvas
          blocks={blocks}
          onBlockClick={blockClick}
          onGroundClick={groundClick}
          direction={direction}
          jumpSignal={jumpSignal}
          fov={fov}
        />
      </div>

      <header className={styles.hudTop}>
        <a className={styles.brand} href="/" aria-label="Back to home">
          <span className={styles.brandIcon}>▦</span>
          <span className={styles.brandName}>
            BUILD<span>WORLD</span>
          </span>
        </a>

        <div className={styles.topCenter}>
          <span className={styles.worldBadge}>
            <i /> WORLD
          </span>
          <span className={styles.status}>
            {message || "Ready to build"}
          </span>
        </div>

        <div className={styles.topActions}>
          <button
            className={styles.iconButton}
            onClick={enterImmersive}
            title="Fullscreen / Landscape"
            aria-label="Fullscreen"
          >
            ⛶
          </button>

          <button
            className={styles.menuButton}
            onClick={() => setPanel("menu")}
          >
            <span>☰</span> MENU
          </button>
        </div>
      </header>

      <div className={styles.toolDock}>
        <div className={styles.dockLabel}>TOOLS</div>

        {(["build", "break", "paint"] as Tool[]).map((item) => (
          <button
            key={item}
            className={`${styles.toolButton} ${styles[item]} ${
              tool === item ? styles.selected : ""
            }`}
            onClick={() => setTool(item)}
            aria-pressed={tool === item}
          >
            <span className={styles.toolIcon}>
              {item === "build" ? "＋" : item === "break" ? "⌁" : "◉"}
            </span>
            <span>{item.toUpperCase()}</span>
          </button>
        ))}

        <div className={styles.colorSlot}>
          <span>COLOR</span>
          <input
            type="color"
            value={paint}
            onChange={(event) => setPaint(event.target.value)}
            aria-label="Block color"
          />
        </div>
      </div>

      <div className={styles.bottomHint}>
        <span className={styles.keyHint}>WASD</span>
        <span>MOVE</span>
        <span className={styles.hintDivider}>•</span>
        <span className={styles.keyHint}>SPACE</span>
        <span>JUMP</span>
      </div>

      <MobileControls
        onMove={(x, z) => setDirection({ x, z })}
        onJump={() => setJumpSignal((value) => value + 1)}
      />

      {portrait && (
        <div className={styles.rotateNotice}>
          <div className={styles.rotateIcon}>↻</div>
          <h2>ROTATE YOUR DEVICE</h2>
          <p>BuildWorld is designed for landscape mode.</p>
          <button onClick={enterImmersive}>TRY LANDSCAPE</button>
        </div>
      )}

      {panel !== "none" && (
        <div className={styles.modalBackdrop}>
          <section className={styles.gamePanel}>
            <button
              className={styles.panelClose}
              onClick={() => setPanel("none")}
              aria-label="Close menu"
            >
              ×
            </button>

            {panel === "menu" && (
              <>
                <div className={styles.panelEyebrow}>BUILDWORLD</div>
                <h2>GAME MENU</h2>

                <button
                  className={styles.panelPrimary}
                  onClick={() => setPanel("none")}
                >
                  ▶ CONTINUE
                </button>

                <button onClick={() => setPanel("save")}>▣ SAVE WORLD</button>

                <button
                  onClick={() => {
                    setPanel("load");
                    refreshSaves().catch((error) => setMessage(error.message));
                  }}
                >
                  ▤ LOAD WORLD
                </button>

                <button
                  onClick={() => {
                    setPanel("leaderboards");
                    void refreshLeaderboard();
                  }}
                >
                  🏆 LEADERBOARDS
                </button>

                <button onClick={() => setPanel("camera")}>
                  ◉ CAMERA SETTINGS
                </button>

                <button onClick={enterImmersive}>⛶ FULLSCREEN</button>
                <button onClick={resetWorld}>↺ RESET WORLD</button>
                <button onClick={exitImmersive}>EXIT FULLSCREEN</button>
              </>
            )}

            {panel === "save" && (
              <>
                <div className={styles.panelEyebrow}>WORLD DATA</div>
                <h2>SAVE WORLD</h2>

                <input
                  value={saveName}
                  onChange={(event) => setSaveName(event.target.value)}
                  placeholder="World name"
                />

                <button
                  className={styles.panelPrimary}
                  onClick={() =>
                    save("manual")
                      .then(() => {
                        setMessage("World saved");
                        setPanel("none");
                      })
                      .catch((error) => setMessage(error.message))
                  }
                >
                  SAVE
                </button>
              </>
            )}

            {panel === "load" && (
              <>
                <div className={styles.panelEyebrow}>WORLD DATA</div>
                <h2>LOAD WORLD</h2>

                {saves.length === 0 && (
                  <p className={styles.empty}>No saved worlds.</p>
                )}

                {saves.map((item) => (
                  <div className={styles.saveItem} key={item.id}>
                    <span>{item.name}</span>
                    <button onClick={() => loadSave(item.id)}>LOAD</button>

                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/saves/${item.id}`, {
                          method: "DELETE",
                        });

                        if (response.ok) {
                          await refreshSaves();
                          setMessage("Save deleted");
                        } else {
                          setMessage("Delete failed");
                        }
                      }}
                    >
                      DELETE
                    </button>
                  </div>
                ))}
              </>
            )}

            {panel === "camera" && (
              <>
                <div className={styles.panelEyebrow}>VIEW SETTINGS</div>
                <h2>CAMERA</h2>

                <label className={styles.cameraSetting}>
                  FIELD OF VIEW <strong>{fov}°</strong>

                  <input
                    type="range"
                    min="45"
                    max="110"
                    value={fov}
                    onChange={(event) => setFov(Number(event.target.value))}
                  />
                </label>

                <p className={styles.empty}>
                  Drag to rotate. Pinch or scroll to zoom.
                </p>
              </>
            )}

            {panel === "leaderboards" && (
              <>
                <div className={styles.panelEyebrow}>BUILDWORLD</div>
                <h2>🏆 LEADERBOARDS</h2>

                <div className={styles.leaderboardTable}>
                  <div className={styles.leaderboardHeader}>
                    <span>PLAYER</span>
                    <span>TIME PLAYED</span>
                  </div>

                  {leaderboardLoading && (
                    <p className={styles.empty}>Loading leaderboard…</p>
                  )}

                  {!leaderboardLoading && leaderboard.length === 0 && (
                    <p className={styles.empty}>
                      No leaderboard entries yet.
                    </p>
                  )}

                  {leaderboard.map((player, index) => (
                    <div
                      className={styles.leaderboardRow}
                      key={`${player.username}-${index}`}
                    >
                      <span>
                        {index + 1}. {player.username}
                      </span>
                      <span>
                        {formatPlaytime(player.seconds_played)}
                      </span>
                    </div>
                  ))}
                </div>

                <button onClick={() => void refreshLeaderboard()}>
                  ↻ REFRESH
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
