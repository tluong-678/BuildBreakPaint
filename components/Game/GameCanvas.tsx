
function OtherPlayerMesh({
  player,
}: {
  player: OtherPlayer;
}) {
  return (
    <group position={[player.x, player.y, player.z]}>
      {/* Head */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.62, 0.62, 0.62]} />
        <meshStandardMaterial color="#f2c49a" />
      </mesh>

      {/* Face */}
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
        <meshStandardMaterial color="#32b7a8" />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.53, 0.12, 0]} castShadow>
        <boxGeometry args={[0.28, 0.82, 0.34]} />
        <meshStandardMaterial color="#f2c49a" />
      </mesh>
      <mesh position={[0.53, 0.12, 0]} castShadow>
        <boxGeometry args={[0.28, 0.82, 0.34]} />
        <meshStandardMaterial color="#f2c49a" />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.21, -0.72, 0]} castShadow>
        <boxGeometry args={[0.34, 0.62, 0.38]} />
        <meshStandardMaterial color="#354f9d" />
      </mesh>
      <mesh position={[0.21, -0.72, 0]} castShadow>
        <boxGeometry args={[0.34, 0.62, 0.38]} />
        <meshStandardMaterial color="#354f9d" />
      </mesh>
    </group>
  );
}

function Player({
  direction,
  jumpSignal,
  blocks,
  controlsRef,
  onPosition,
}: {
  direction: { x: number; z: number };
  jumpSignal: number;
  blocks: BlockData[];
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onPosition?: (position: PlayerPosition) => void;
}) {
  const playerRef = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);

  const velocityY = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const jumpRequested = useRef(false);
  const lastJump = useRef(jumpSignal);
  const grounded = useRef(false);
  const positionSendTimer = useRef(0);

  const speed = 5;
  const gravity = 20;
  const jumpPower = 8;
  const playerHeight = 1.8;
  const groundTop = -0.5;

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const movementKeys = [
        "w", "a", "s", "d",
        "arrowup", "arrowdown",
        "arrowleft", "arrowright", " ",
      ];

      if (movementKeys.includes(key)) event.preventDefault();

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

  useFrame(({ camera, clock }, delta) => {
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

    const moving = Math.hypot(moveX, moveZ) > 0.08;

    player.position.x += moveX * speed * dt;
    player.position.z += moveZ * speed * dt;

    if (moving) {
      player.rotation.y = Math.atan2(moveX, -moveZ);
    }

    // Simple blocky walking animation.
    const swing = moving ? Math.sin(clock.elapsedTime * 9) * 0.55 : 0;

    if (leftArm.current) leftArm.current.rotation.x = swing;
    if (rightArm.current) rightArm.current.rotation.x = -swing;
    if (leftLeg.current) leftLeg.current.rotation.x = -swing;
    if (rightLeg.current) rightLeg.current.rotation.x = swing;

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

    const floorPlayerY = groundTop + playerHeight / 2;

    if (
      player.position.y <= floorPlayerY &&
      velocityY.current <= 0
    ) {
      player.position.y = floorPlayerY;
      velocityY.current = 0;
      grounded.current = true;
    }

    if (velocityY.current <= 0) {
      for (const block of blocks) {
        const insideX =
          Math.abs(player.position.x - block.x) < 0.48;
        const insideZ =
          Math.abs(player.position.z - block.z) < 0.48;

        const top = block.y + 0.5;
        const playerBottom =
          player.position.y - playerHeight / 2;
        const previousBottom =
          previousY - playerHeight / 2;

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

    if (player.position.y < -15) {
      player.position.set(3, 1.1, 3);
      velocityY.current = 0;
      grounded.current = false;
    }

    positionSendTimer.current += dt;

    if (positionSendTimer.current >= 0.1) {
      positionSendTimer.current = 0;
      onPosition?.({
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      });
    }

    const controls = controlsRef.current;

    if (controls) {
      const target = new THREE.Vector3(
        player.position.x,
        player.position.y + 1.1,
        player.position.z
      );

      const shift = target.clone().sub(controls.target);
      const smooth = Math.min(1, dt * 5);

      controls.target.lerp(target, smooth);
      camera.position.add(shift.multiplyScalar(smooth));
      controls.update();
    }
  });

  return (
    <group ref={playerRef} position={[3, 1.1, 3]}>
      {/* Head */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.62, 0.62, 0.62]} />
        <meshStandardMaterial color="#ffd0a5" />
      </mesh>

      {/* Face */}
      <mesh position={[-0.15, 0.96, -0.315]}>
        <boxGeometry args={[0.07, 0.09, 0.025]} />
        <meshStandardMaterial color="#17253b" />
      </mesh>
      <mesh position={[0.15, 0.96, -0.315]}>
        <boxGeometry args={[0.07, 0.09, 0.025]} />
        <meshStandardMaterial color="#17253b" />
      </mesh>

      {/* Shirt */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.78, 0.9, 0.42]} />
        <meshStandardMaterial color="#ff9f35" />
      </mesh>

      {/* Arms */}
      <mesh ref={leftArm} position={[-0.53, 0.12, 0]} castShadow>
        <boxGeometry args={[0.28, 0.82, 0.34]} />
        <meshStandardMaterial color="#ffd0a5" />
      </mesh>
      <mesh ref={rightArm} position={[0.53, 0.12, 0]} castShadow>
        <boxGeometry args={[0.28, 0.82, 0.34]} />
        <meshStandardMaterial color="#ffd0a5" />
      </mesh>

      {/* Pants */}
      <mesh ref={leftLeg} position={[-0.21, -0.72, 0]} castShadow>
        <boxGeometry args={[0.34, 0.62, 0.38]} />
        <meshStandardMaterial color="#3156a5" />
      </mesh>
      <mesh ref={rightLeg} position={[0.21, -0.72, 0]} castShadow>
        <boxGeometry args={[0.34, 0.62, 0.38]} />
        <meshStandardMaterial color="#3156a5" />
      </mesh>
    </group>
  );
}
