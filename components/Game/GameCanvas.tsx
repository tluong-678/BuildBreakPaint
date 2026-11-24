
"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { BlockData } from "./types";

type GameCanvasProps = {
  blocks: BlockData[];
  onBlockClick: (id: string, normal: [number, number, number]) => void;
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
  onClick: (id: string, normal: [number, number, number]) => void;
}) {
  return (
    <mesh
      position={[block.x, block.y, block.z]}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();

        const normal = event.face?.normal
          ? event.face.normal
              .clone()
              .transformDirection(event.object.matrixWorld)
              .round()
          : new THREE.Vector3(0, 1, 0);

        onClick(block.id, [normal.x, normal.y, normal.z]);
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
  controlsRef,
}: {
  direction: { x: number; z: number };
  jumpSignal: number;
  blocks: BlockData[];
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const playerRef = useRef<THREE.Mesh>(null);
  const velocityY = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const jumpRequested = useRef(false);
  const lastJump = useRef(jumpSignal);
  const grounded = useRef(true);

  const speed = 5;
  const gravity = 20;
  const jumpPower = 8;
  const playerHeight = 0.8;
  const groundTop = -0.5;

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if (
        [
          "w", "a", "s", "d",
          "arrowup", "arrowdown",
          "arrowleft", "arrowright",
          " "
        ].includes(key)
      ) {
        event.preventDefault();
      }

      if (key === " " && !keys.current[key]) {
        jumpRequested.current = true;
      }

      keys.current[key] = true;
    }

    function keyUp(event: KeyboardEvent) {
      keys.current[event.key.toLowerCase()] = false;
    }

    function clearKeys() {
      keys.current = {};
    }

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearKeys);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const player = playerRef.current;
    if (!player) return;

    const dt = Math.min(delta, 0.05);

    let moveX = direction.x;
    let moveZ = direction.z;

    if (keys.current.a || keys.current.arrowleft) moveX -= 1;
    if (keys.current.d || keys.current.arrowright) moveX += 1;
    if (keys.current.w || keys.current.arrowup) moveZ -= 1;
    if (keys.current.s || keys.current.arrowdown) moveZ += 1;

    const length = Math.hypot(moveX, moveZ);
    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }

    player.position.x += moveX * speed * dt;
    player.position.z += moveZ * speed * dt;

    // Chỉ nhảy khi có lần bấm mới và đang đứng trên mặt đất.
    if (jumpSignal !== lastJump.current) {
      jumpRequested.current = true;
    }
    lastJump.current = jumpSignal;

    if (jumpRequested.current && grounded.current) {
      velocityY.current = jumpPower;
      grounded.current = false;
    }
    jumpRequested.current = false;

    const previousY = player.position.y;
    velocityY.current -= gravity * dt;
    player.position.y += velocityY.current * dt;
    grounded.current = false;

    // Mặt đất.
    const floorPlayerY = groundTop + playerHeight / 2;
    if (player.position.y <= floorPlayerY && velocityY.current <= 0) {
      player.position.y = floorPlayerY;
      velocityY.current = 0;
      grounded.current = true;
    }

    // Chỉ xử lý hạ cánh từ phía trên khối.
    if (velocityY.current <= 0) {
      for (const block of blocks) {
        const insideX =
          Math.abs(player.position.x - block.x) < 0.48;
        const insideZ =
          Math.abs(player.position.z - block.z) < 0.48;

        const top = block.y + 0.5;
        const playerBottom = player.position.y - playerHeight / 2;
        const previousBottom = previousY - playerHeight / 2;

        if (
          insideX &&
          insideZ &&
          previousBottom >= top - 0.05 &&
          playerBottom <= top
        ) {
          player.position.y = top + playerHeight / 2;
          velocityY.current = 0;
          grounded.current = true;
        }
      }
    }

    // Rơi khỏi map: hồi sinh tại điểm xuất phát.
    if (player.position.y < -15) {
      player.position.set(3, 1, 3);
      velocityY.current = 0;
      grounded.current = false;
    }

    // Camera theo nhân vật, vẫn giữ khả năng xoay bằng OrbitControls.
    const controls = controlsRef.current;
    if (controls) {
      const target = new THREE.Vector3(
        player.position.x,
        player.position.y + 1,
        player.position.z
      );

      const shift = target.clone().sub(controls.target);
      controls.target.lerp(target, Math.min(1, dt * 5));
      camera.position.add(shift.multiplyScalar(Math.min(1, dt * 5)));
      controls.update();
    }
  });

  return (
    <mesh ref={playerRef} position={[3, 1, 3]} castShadow>
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
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

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
        controlsRef={controlsRef}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.51, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onGroundClick([
            Math.round(event.point.x),
            0,
            Math.round(event.point.z),
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
        ref={controlsRef}
        makeDefault
        minDistance={3}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
