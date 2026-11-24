
"use client";

import { useRef, useState } from "react";
import styles from "./Game.module.css";

type Props = {
  onMove: (x: number, z: number) => void;
  onJump: () => void;
};

export default function MobileControls({
  onMove,
  onJump,
}: Props) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const radius = 45;

  function updateJoystick(e: React.PointerEvent) {
    const joystick = joystickRef.current;
    if (!joystick) return;

    const rect = joystick.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let x = e.clientX - centerX;
    let y = e.clientY - centerY;

    const distance = Math.sqrt(x * x + y * y);

    if (distance > radius) {
      x = (x / distance) * radius;
      y = (y / distance) * radius;
    }

    setKnob({ x, y });

    onMove(
      x / radius,
      y / radius
    );
  }

  function stopJoystick() {
    pointerRef.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  }

  return (
    <div className={styles.mobileControls}>
      <div
        ref={joystickRef}
        className={styles.joystick}
        onPointerDown={(e) => {
          pointerRef.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateJoystick(e);
        }}
        onPointerMove={(e) => {
          if (pointerRef.current === e.pointerId) {
            updateJoystick(e);
          }
        }}
        onPointerUp={stopJoystick}
        onPointerCancel={stopJoystick}
        onLostPointerCapture={stopJoystick}
      >
        <div
          className={styles.joystickKnob}
          style={{
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>

      <button
        className={styles.jumpButton}
        onPointerDown={(e) => {
          e.preventDefault();
          onJump();
        }}
      >
        JUMP
      </button>
    </div>
  );
          }
