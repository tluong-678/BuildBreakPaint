"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlockData, Tool, WorldData } from "./types";
import styles from "./Game.module.css";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });
const starterBlocks: BlockData[] = [
  { id: "starter-1", x: 0, y: 0, z: 0, color: "#e9a23b" },
  { id: "starter-2", x: 1, y: 0, z: 0, color: "#4b9bd8" },
  { id: "starter-3", x: 0, y: 1, z: 0, color: "#72b86b" }
];

export default function GameClient() {
  const [blocks, setBlocks] = useState<BlockData[]>(starterBlocks);
  const [tool, setTool] = useState<Tool>("build");
  const [paint, setPaint] = useState("#ff4d6d");
  const [saveName, setSaveName] = useState("My world");
  const [panel, setPanel] = useState<"none" | "menu" | "save" | "load" | "camera">("none");
  const [saves, setSaves] = useState<Array<{id:string;name:string;type:string;created_at:string}>>([]);
  const [message, setMessage] = useState("");
  const [fov, setFov] = useState(55);
  const lastSaved = useRef("");
  const world = useMemo<WorldData>(() => ({ version: 1, blocks }), [blocks]);

  const save = useCallback(async (type: "manual" | "auto" | "exit" = "manual") => {
    const response = await fetch("/api/saves", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: type === "manual" ? saveName : `${type === "auto" ? "Auto save" : "Exit save"} · ${new Date().toLocaleString()}`,
        type, world
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Save failed");
    lastSaved.current = JSON.stringify(world);
    return data;
  }, [saveName, world]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (JSON.stringify(world) !== lastSaved.current) {
        save("auto").then(() => setMessage("Auto-saved")).catch(e => setMessage(e.message));
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [save, world]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && JSON.stringify(world) !== lastSaved.current) {
        const payload = new Blob([JSON.stringify({
          name: "Exit save", type: "exit", world
        })], { type: "application/json" });
        navigator.sendBeacon("/api/saves", payload);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [world]);

  async function refreshSaves() {
    const res = await fetch("/api/saves");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load saves");
    setSaves(data.saves ?? []);
  }
  async function loadSave(id: string) {
    const res = await fetch(`/api/saves/${id}/load`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || "Load failed");
    setBlocks(data.save.world.blocks);
    lastSaved.current = JSON.stringify(data.save.world);
    setPanel("none");
    setMessage("World loaded");
  }
  function blockClick(id: string) {
    if (tool === "break") setBlocks(old => old.filter(b => b.id !== id));
    if (tool === "paint") setBlocks(old => old.map(b => b.id === id ? { ...b, color: paint } : b));
  }
  function groundClick([x, y, z]: [number, number, number]) {
    if (tool !== "build" || blocks.some(b => b.x === x && b.y === y && b.z === z)) return;
    setBlocks(old => [...old, { id: crypto.randomUUID(), x, y, z, color: paint }]);
  }

  return <main className={styles.page}>
    <header className={styles.top}><a href="/">← Build, Break, Paint!</a><span>{message}</span><button onClick={() => setPanel("menu")}>☰ Menu</button></header>
    <section className={styles.stage}><GameCanvas blocks={blocks} onBlockClick={blockClick} onGroundClick={groundClick} /></section>
    <nav className={styles.toolbar}>
      {(["build", "break", "paint"] as Tool[]).map(t => <button key={t} className={tool === t ? styles.active : ""} onClick={() => setTool(t)}>{t.toUpperCase()}</button>)}
      <label className={styles.color}>Color <input type="color" value={paint} onChange={e => setPaint(e.target.value)} /></label>
    </nav>
    {panel !== "none" && <div className={styles.backdrop}><section className={styles.dialog}>
      <button className={styles.close} onClick={() => setPanel("none")}>×</button>
      {panel === "menu" && <><h2>Game menu</h2><button onClick={() => setPanel("save")}>Save</button><button onClick={() => { setPanel("load"); refreshSaves().catch(e => setMessage(e.message)); }}>Load</button><button onClick={() => { if (window.confirm("Reset this world?")) setBlocks(starterBlocks); setPanel("none"); }}>Reset</button><button onClick={() => setPanel("camera")}>Camera setting</button><button onClick={() => setPanel("none")}>Continue</button><a href="/">Title</a></>}
      {panel === "save" && <><h2>Save world</h2><input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Save name" /><button onClick={() => save("manual").then(() => { setMessage("Saved"); setPanel("none"); }).catch(e => setMessage(e.message))}>Save</button></>}
      {panel === "load" && <><h2>Load world</h2>{saves.length === 0 && <p>No saves found.</p>}{saves.map(s => <div className={styles.saveRow} key={s.id}><span>{s.name} · {s.type}</span><button onClick={() => loadSave(s.id)}>Load</button><button onClick={async () => { const r = await fetch(`/api/saves/${s.id}`, { method: "DELETE" }); if (r.ok) refreshSaves(); }}>Delete</button></div>)}</>}
      {panel === "camera" && <><h2>Camera setting</h2><label>Field of view: {fov}° <input type="range" min="45" max="110" value={fov} onChange={e => setFov(Number(e.target.value))} /></label><p>Camera zoom and rotation: drag and scroll on the 3D scene.</p></>}
    </section></div>}
  </main>;
}
