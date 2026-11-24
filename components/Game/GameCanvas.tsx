
"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { BlockData } from "./types";

type GameCanvasProps = {
  blocks: BlockData[];
  onBlockClick: (id: string) => void;
  onGroundClick: (point: [number, number, number]) => void;
  direction: { x: number; z: number };
  jumpSignal: number;
  fov: number;
};

function Block({
  block,
  onClick,
}: {
  block: BlockData;
  onClick: (id: string) => void;
}) {
  return (
    <mesh
      position={[block.x, block.y, block.z]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onClick(block.id);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={block.color} />
    </mesh>
  );
}

function Player({
  direction,
  jumpSignal,
  blocks,
}: {
  direction: { x: number; z: number };
  jumpSignal: number;
  blocks: BlockData[];
}) {
  const playerRef = useRef<THREE.Mesh>(null);
  const velocityY = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const lastJump = useRef(jumpSignal);

  const speed = 5;
  const gravity = 18;
  const jumpPower = 8;

  useEffect(() => {
    function keyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();

      if (
        ["w", "a", "s", "d", "arrowup", "arrowdown",
          "arrowleft", "arrowright", " "].includes(key)
      ) {
        e.preventDefault();
      }

      keys.current[key] = true;
    }

    function keyUp(e: KeyboardEvent) {
      keys.current[e.key.toLowerCase()] = false;
    }

    function blur() {
      keys.current = {};
    }

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useFrame((_, delta) => {
    const player = playerRef.current;
    if (!player) return;

    const dt = Math.min(delta, 0.05);

    let moveX = direction.x;
    let moveZ = direction.z;

    if (keys.current["a"] || keys.current["arrowleft"]) {
      moveX -= 1;
    }
    if (keys.current["d"] || keys.current["arrowright"]) {
      moveX += 1;
    }
    if (keys.current["w"] || keys.current["arrowup"]) {
      moveZ -= 1;
    }
    if (keys.current["s"] || keys.current["arrowdown"]) {
      moveZ += 1;
    }

    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);

    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }

    player.position.x += moveX * speed * dt;
    player.position.z += moveZ * speed * dt;

    // Nhảy bằng Space hoặc nút JUMP
    const spacePressed = keys.current[" "];

    if (
      (spacePressed || jumpSignal !== lastJump.current) &&
      Math.abs(velocityY.current) < 0.01
    ) {
      velocityY.current = jumpPower;
    }

    lastJump.current = jumpSignal;

    // Trọng lực
    velocityY.current -= gravity * dt;
    player.position.y += velocityY.current * dt;

    // Mặt đất
    const groundY = -0.1;

    if (player.position.y < groundY) {
      player.position.y = groundY;
      velocityY.current = 0;
    }

    // Đứng trên các khối khi rơi xuống
    for (const block of blocks) {
      const insideX =
        Math.abs(player.position.x - block.x) < 0.5;
      const insideZ =
        Math.abs(player.position.z - block.z) < 0.5;

      const blockTop = block.y + 0.5;
      const playerBottom = player.position.y - 0.4;

      if (
        insideX &&
        insideZ &&
        velocityY.current <= 0 &&
        playerBottom <= blockTop &&
        playerBottom >= blockTop - 0.25
      ) {
        player.position.y = blockTop + 0.4;
        velocityY.current = 0;
      }
    }
  });

  return (
    <mesh
      ref={playerRef}
      position={[3, -0.1, 3]}
      castShadow
    >
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#ffcc33" />
    </mesh>
  );
}

export default function GameCanvas({
  blocks,
  onBlockClick,
  onGroundClick,
  direction,
  jumpSignal,
  fov,
}: GameCanvasProps) {
  return (
    <Canvas
      shadows
      camera={{
        position: [9, 8, 11],
        fov,
      }}
    >
      <color attach="background" args={["#b9dcf5"]} />

      <ambientLight intensity={0.75} />

      <directionalLight
        position={[8, 12, 5]}
        intensity={1.4}
        castShadow
      />

      {blocks.map((block) => (
        <Block
          key={block.id}
          block={block}
          onClick={onBlockClick}
        />
      ))}

      <Player
        direction={direction}
        jumpSignal={jumpSignal}
        blocks={blocks}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.51, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();

          onGroundClick([
            Math.round(e.point.x),
            0,
            Math.round(e.point.z),
          ]);
        }}
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#83b96d" />
      </mesh>

      <Grid
        args={[100, 100]}
        position={[0, -0.5, 0]}
        cellSize={1}
        cellThickness={0.5}
        sectionSize={5}
        sectionThickness={1}
        fadeDistance={45}
      />

      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
