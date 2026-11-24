
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

export default function GameClient() {
  const [blocks, setBlocks] = useState<BlockData[]>(starterBlocks);
  const [tool, setTool] = useState<Tool>("build");
  const [paint, setPaint] = useState("#ff4d6d");
  const [saveName, setSaveName] = useState("My world");

  const [panel, setPanel] = useState<
    "none" | "menu" | "save" | "load" | "camera"
  >("none");

  const [saves, setSaves] = useState<SaveItem[]>([]);
  const [message, setMessage] = useState("");
  const [fov, setFov] = useState(55);

  const [direction, setDirection] = useState({
    x: 0,
    z: 0,
  });

  const [jumpSignal, setJumpSignal] = useState(0);
  const lastSaved = useRef("");

  const world = useMemo<WorldData>(
    () => ({
      version: 1,
      blocks,
    }),
    [blocks]
  );

  const save = useCallback(
    async (type: "manual" | "auto" | "exit" = "manual") => {
      const response = await fetch("/api/saves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name:
            type === "manual"
              ? saveName.trim() || "My world"
              : `${
                  type === "auto" ? "Auto save" : "Exit save"
                } · ${new Date().toLocaleString()}`,
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
        {
          type: "application/json",
        }
      );

      navigator.sendBeacon("/api/saves", payload);
    }

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );
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
    const selected = blocks.find(
      (block) => block.id === id
    );

    if (!selected) return;

    if (tool === "break") {
      setBlocks((old) =>
        old.filter((block) => block.id !== id)
      );
      return;
    }

    if (tool === "paint") {
      setBlocks((old) =>
        old.map((block) =>
          block.id === id
            ? { ...block, color: paint }
            : block
        )
      );
      return;
    }

    if (tool === "build") {
      const x = selected.x + normal[0];
      const y = selected.y + normal[1];
      const z = selected.z + normal[2];

      const occupied = blocks.some(
        (block) =>
          block.x === x &&
          block.y === y &&
          block.z === z
      );

      if (occupied) return;

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
  }

  function groundClick(
    [x, y, z]: [number, number, number]
  ) {
    if (tool !== "build") return;

    const occupied = blocks.some(
      (block) =>
        block.x === x &&
        block.y === y &&
        block.z === z
    );

    if (occupied) return;

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
    <main className={styles.page}>
      <header className={styles.top}>
        <a href="/">← Build, Break, Paint!</a>
        <span>{message}</span>
        <button onClick={() => setPanel("menu")}>
          ☰ Menu
        </button>
      </header>

      <section className={styles.stage}>
        <GameCanvas
          blocks={blocks}
          onBlockClick={blockClick}
          onGroundClick={groundClick}
          direction={direction}
          jumpSignal={jumpSignal}
          fov={fov}
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
              className={
                tool === item ? styles.active : ""
              }
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
            onChange={(event) =>
              setPaint(event.target.value)
            }
          />
        </label>
      </nav>

      {panel !== "none" && (
        <div className={styles.backdrop}>
          <section className={styles.dialog}>
            <button
              className={styles.close}
              onClick={() => setPanel("none")}
            >
              ×
            </button>

            {panel === "menu" && (
              <>
                <h2>Game menu</h2>

                <button onClick={() => setPanel("save")}>
                  Save
                </button>

                <button
                  onClick={() => {
                    setPanel("load");
                    refreshSaves().catch((error) =>
                      setMessage(error.message)
                    );
                  }}
                >
                  Load
                </button>

                <button onClick={resetWorld}>
                  Reset
                </button>

                <button
                  onClick={() => setPanel("camera")}
                >
                  Camera setting
                </button>

                <button onClick={() => setPanel("none")}>
                  Continue
                </button>

                <a href="/">Title</a>
              </>
            )}

            {panel === "save" && (
              <>
                <h2>Save world</h2>

                <input
                  value={saveName}
                  onChange={(event) =>
                    setSaveName(event.target.value)
                  }
                  placeholder="Save name"
                />

                <button
                  onClick={() =>
                    save("manual")
                      .then(() => {
                        setMessage("Saved");
                        setPanel("none");
                      })
                      .catch((error) =>
                        setMessage(error.message)
                      )
                  }
                >
                  Save
                </button>
              </>
            )}

            {panel === "load" && (
              <>
                <h2>Load world</h2>

                {saves.length === 0 && (
                  <p>No saves found.</p>
                )}

                {saves.map((item) => (
                  <div
                    className={styles.saveRow}
                    key={item.id}
                  >
                    <span>
                      {item.name} · {item.type}
                    </span>

                    <button
                      onClick={() => loadSave(item.id)}
                    >
                      Load
                    </button>

                    <button
                      onClick={async () => {
                        const response = await fetch(
                          `/api/saves/${item.id}`,
                          {
                            method: "DELETE",
                          }
                        );

                        if (response.ok) {
                          await refreshSaves();
                          setMessage("Save deleted");
                        } else {
                          setMessage("Delete failed");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </>
            )}

            {panel === "camera" && (
              <>
                <h2>Camera setting</h2>

                <label>
                  Field of view: {fov}°

                  <input
                    type="range"
                    min="45"
                    max="110"
                    value={fov}
                    onChange={(event) =>
                      setFov(Number(event.target.value))
                    }
                  />
                </label>

                <p>
                  Drag to rotate and scroll to zoom.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
