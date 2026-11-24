
"use client";

import {
  useEffect,
  useRef,
} from "react";
import * as THREE from "three";
import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  Grid,
  Html,
  OrbitControls,
} from "@react-three/drei";
import type { BlockData } from "./types";

type PlayerPosition = {
  x: number;
  y: number;
  z: number;
};

type OtherPlayer = PlayerPosition & {
  id: string;
  username: string;
};

type GameCanvasProps = {
  blocks: BlockData[];
  onBlockClick: (
    id: string,
    normal: [number, number, number]
  ) => void;
  onGroundClick: (
    position: [number, number, number]
  ) => void;
  direction: {
    x: number;
    z: number;
  };
  jumpSignal: number;
  fov: number;
  onPosition?: (position: PlayerPosition) => void;
  otherPlayers?: OtherPlayer[];
  username?: string;
};

function Block({
  block,
  onClick,
}: {
  block: BlockData;
  onClick: GameCanvasProps["onBlockClick"];
}) {
  return (
    <mesh
      position={[block.x, block.y, block.z]}
      castShadow
      receiveShadow
      onPointerDown={(event) => {
        event.stopPropagation();

        if (!event.face) return;

        const normal = event.face.normal
          .clone()
          .transformDirection(event.object.matrixWorld)
          .round();

        onClick(block.id, [
          normal.x,
          normal.y,
          normal.z,
        ]);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={block.color}
        roughness={0.8}
      />
    </mesh>
  );
}

function BlockyAvatar({
  username,
  color = "#ff9f35",
  position,
  local = false,
}: {
  username: string;
  color?: string;
  position?: [number, number, number];
  local?: boolean;
}) {
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!local) return;

    const swing = Math.sin(clock.elapsedTime * 9) * 0.45;

    if (leftArm.current) {
      leftArm.current.rotation.x = swing;
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = -swing;
    }
    if (leftLeg.current) {
      leftLeg.current.rotation.x = -swing;
    }
    if (rightLeg.current) {
      rightLeg.current.rotation.x = swing;
    }
  });

  return (
    <group position={position}>
      <Html
        position={[0, 2.05, 0]}
        center
        distanceFactor={12}
        occlude={false}
      >
        <div
          style={{
            padding: "4px 9px",
            borderRadius: "7px",
            background: "#172b46dd",
            border: "1px solid #ffffff55",
            color: "white",
            fontSize: "12px",
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            whiteSpace: "nowrap",
            textShadow: "0 1px 2px #000",
            pointerEvents: "none",
          }}
        >
          {username || "Player"}
        </div>
      </Html>

      {/* Head */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.62, 0.62, 0.62]} />
        <meshStandardMaterial color="#ffd0a5" />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.15, 0.96, -0.315]}>
        <boxGeometry args={[0.07, 0.09, 0.025]} />
        <meshStandardMaterial color="#17253b" />
      </mesh>
      <mesh position={[0.15, 0.96, -0.315]}>
        <boxGeometry args={[0.07, 0.09, 0.025]} />
        <meshStandardMaterial color="#17253b" />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.78, 0.9, 0.42]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Arms */}
      <mesh
        ref={leftArm}
        position={[-0.53, 0.12, 0]}
        castShadow
      >
        <boxGeometry args={[0.28, 0.82, 0.34]} />
        <meshStandardMaterial color="#ffd0a5" />
      </mesh>
      <mesh
        ref={rightArm}
        position={[0.53, 0.12, 0]}
        castShadow
      >
        <boxGeometry args={[0.28, 0.82, 0.34]} />
        <meshStandardMaterial color="#ffd0a5" />
      </mesh>

      {/* Legs */}
      <mesh
        ref={leftLeg}
        position={[-0.21, -0.72, 0]}
        castShadow
      >
        <boxGeometry args={[0.34, 0.62, 0.38]} />
        <meshStandardMaterial color="#3156a5" />
      </mesh>
      <mesh
        ref={rightLeg}
        position={[0.21, -0.72, 0]}
        castShadow
      >
        <boxGeometry args={[0.34, 0.62, 0.38]} />
        <meshStandardMaterial color="#3156a5" />
      </mesh>
    </group>
  );
}

function Player({
  direction,
  jumpSignal,
  blocks,
  onPosition,
  username,
}: {
  direction: GameCanvasProps["direction"];
  jumpSignal: number;
  blocks: BlockData[];
  onPosition?: GameCanvasProps["onPosition"];
  username: string;
}) {
  const playerRef = useRef<THREE.Group>(null);
  const velocityY = useRef(0);
  const grounded = useRef(false);
  const jumpRequested = useRef(false);
  const lastJump = useRef(jumpSignal);
  const keys = useRef<Record<string, boolean>>({});
  const sendTimer = useRef(0);

  const { camera } = useThree();

  const speed = 5;
  const gravity = 20;
  const jumpPower = 8;
  const playerHeight = 1.8;

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if (
        [
          "w", "a", "s", "d",
          "arrowup", "arrowdown",
          "arrowleft", "arrowright",
          " ",
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

  useFrame((state, delta) => {
    const player = playerRef.current;
    if (!player) return;

    const dt = Math.min(delta, 0.05);

    let moveX = direction.x;
    let moveZ = direction.z;

    if (keys.current.a || keys.current.arrowleft) {
      moveX -= 1;
    }
    if (keys.current.d || keys.current.arrowright) {
      moveX += 1;
    }
    if (keys.current.w || keys.current.arrowup) {
      moveZ -= 1;
    }
    if (keys.current.s || keys.current.arrowdown) {
      moveZ += 1;
    }

    const length = Math.hypot(moveX, moveZ);

    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }

    const moving = Math.hypot(moveX, moveZ) > 0.08;

    player.position.x += moveX * speed * dt;
    player.position.z += moveZ * speed * dt;

    if (moving) {
      player.rotation.y = Math.atan2(moveX, -moveZ);
    }

    if (jumpSignal !== lastJump.current) {
      jumpRequested.current = true;
      lastJump.current = jumpSignal;
    }

    if (jumpRequested.current && grounded.current) {
      velocityY.current = jumpPower;
      grounded.current = false;
    }

    jumpRequested.current = false;

    const previousY = player.position.y;

    velocityY.current -= gravity * dt;
    player.position.y += velocityY.current * dt;
    grounded.current = false;

    // Floor collision.
    const floorY = -0.5 + playerHeight / 2;

    if (
      player.position.y <= floorY &&
      velocityY.current <= 0
    ) {
      player.position.y = floorY;
      velocityY.current = 0;
      grounded.current = true;
    }

    // Block landing collision.
    if (velocityY.current <= 0) {
      for (const block of blocks) {
        const insideX =
          Math.abs(player.position.x - block.x) < 0.48;
        const insideZ =
          Math.abs(player.position.z - block.z) < 0.48;

        const blockTop = block.y + 0.5;
        const currentBottom =
          player.position.y - playerHeight / 2;
        const previousBottom =
          previousY - playerHeight / 2;

        if (
          insideX &&
          insideZ &&
          previousBottom >= blockTop - 0.05 &&
          currentBottom <= blockTop
        ) {
          player.position.y =
            blockTop + playerHeight / 2;
          velocityY.current = 0;
          grounded.current = true;
        }
      }
    }

    // Respawn if the player falls.
    if (player.position.y < -15) {
      player.position.set(3, 1.1, 3);
      velocityY.current = 0;
      grounded.current = false;
    }

    // Camera follows the player.
    const target = new THREE.Vector3(
      player.position.x,
      player.position.y + 1.1,
      player.position.z
    );

    const cameraOffset = new THREE.Vector3(7, 7, 9);
    const desiredCamera = target.clone().add(cameraOffset);

    camera.position.lerp(
      desiredCamera,
      Math.min(1, dt * 3)
    );

    state.controls?.update?.();

    // Send position to multiplayer.
    sendTimer.current += dt;

    if (sendTimer.current >= 0.1) {
      sendTimer.current = 0;

      onPosition?.({
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      });
    }
  });

  return (
    <group ref={playerRef} position={[3, 1.1, 3]}>
      <BlockyAvatar username={username} local />
    </group>
  );
}

function Scene({
  blocks,
  onBlockClick,
  onGroundClick,
  direction,
  jumpSignal,
  fov,
  onPosition,
  otherPlayers = [],
  username = "Player",
}: GameCanvasProps) {
  return (
    <>
      <color attach="background" args={["#83b9e8"]} />

      <ambientLight intensity={1.3} />

      <directionalLight
        position={[8, 14, 6]}
        intensity={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1, 0]}
        receiveShadow
        onPointerDown={(event) => {
          event.stopPropagation();

          const x = Math.round(event.point.x);
          const z = Math.round(event.point.z);

          onGroundClick([x, 0, z]);
        }}
      >
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#79b86c" />
      </mesh>

      <Grid
        position={[0, -0.98, 0]}
        args={[300, 300]}
        cellSize={1}
        cellThickness={0.5}
        sectionSize={10}
        sectionThickness={1}
        fadeDistance={100}
        fadeStrength={1}
        infiniteGrid
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
        onPosition={onPosition}
        username={username}
      />

      {otherPlayers.map((player) => (
        <BlockyAvatar
          key={player.id}
          username={player.username}
          position={[player.x, player.y, player.z]}
          color="#32b7a8"
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={5}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={0.2}
      />
    </>
  );
}

export default function GameCanvas(props: GameCanvasProps) {
  return (
    <Canvas
      shadows
      camera={{
        position: [10, 8, 12],
        fov: props.fov,
        near: 0.1,
        far: 500,
      }}
      gl={{
        antialias: true,
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
