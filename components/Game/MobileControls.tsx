
"use client";

import { useCallback, useRef, useState } from "react";

type MobileControlsProps = {
  onMove: (x: number, z: number) => void;
  onJump: () => void;
};

const JOYSTICK_RADIUS = 45;
const MAX_DISTANCE = 34;
const DEAD_ZONE = 0.12;

export default function MobileControls({
  onMove,
  onJump,
}: MobileControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const resetJoystick = useCallback(() => {
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    setActive(false);
    onMove(0, 0);
  }, [onMove]);

  const updateJoystick = useCallback(
    (clientX: number, clientY: number) => {
      const joystick = joystickRef.current;
      if (!joystick) return;

      const rect = joystick.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > MAX_DISTANCE) {
        const scale = MAX_DISTANCE / distance;
        dx *= scale;
        dy *= scale;
      }

      setKnob({ x: dx, y: dy });

      let x = dx / MAX_DISTANCE;
      let z = dy / MAX_DISTANCE;

      if (Math.abs(x) < DEAD_ZONE) x = 0;
      if (Math.abs(z) < DEAD_ZONE) z = 0;

      onMove(x, z);
    },
    [onMove],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== null) return;

      event.preventDefault();

      pointerIdRef.current = event.pointerId;
      setActive(true);

      event.currentTarget.setPointerCapture(event.pointerId);

      updateJoystick(event.clientX, event.clientY);
    },
    [updateJoystick],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;

      event.preventDefault();
      updateJoystick(event.clientX, event.clientY);
    },
    [updateJoystick],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;

      event.preventDefault();
      resetJoystick();
    },
    [resetJoystick],
  );

  const handleJump = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      onJump();
    },
    [onJump],
  );

  return (
    <div className="mobileControls">
      <div
        ref={joystickRef}
        className={`joystick ${active ? "joystickActive" : ""}`}
        style={{
          width: JOYSTICK_RADIUS * 2,
          height: JOYSTICK_RADIUS * 2,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={resetJoystick}
      >
        <div
          className="joystickKnob"
          style={{
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>

      <button
        type="button"
        className="jumpButton"
        onPointerDown={handleJump}
        aria-label="Nhảy"
      >
        JUMP
      </button>
    </div>
  );
}
