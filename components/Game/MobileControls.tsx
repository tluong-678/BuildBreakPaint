
"use client";

import { useCallback, useRef, useState } from "react";
import type { PointerEvent } from "react";
import styles from "./Game.module.css";

type MobileControlsProps = {
  onMove: (x: number, z: number) => void;
  onJump: () => void;
};

const MAX_DISTANCE = 48;
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
      const element = joystickRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const distance = Math.hypot(dx, dy);
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
    [onMove]
  );

  const handleDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== null) return;

      event.preventDefault();
      pointerIdRef.current = event.pointerId;
      setActive(true);
      event.currentTarget.setPointerCapture(event.pointerId);

      updateJoystick(event.clientX, event.clientY);
    },
    [updateJoystick]
  );

  const handleMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      updateJoystick(event.clientX, event.clientY);
    },
    [updateJoystick]
  );

  const handleEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      resetJoystick();
    },
    [resetJoystick]
  );

  return (
    <div className={styles.mobileControls}>
      <div className={styles.leftControls}>
        <div className={styles.controlCaption}>MOVE</div>
        <div
          ref={joystickRef}
          className={`${styles.joystick} ${
            active ? styles.joystickActive : ""
          }`}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleEnd}
          onPointerCancel={handleEnd}
        >
          <span className={styles.joyArrow}>▲</span>
          <span className={styles.joyArrow}>▼</span>
          <span className={styles.joyArrow}>◀</span>
          <span className={styles.joyArrow}>▶</span>
          <div
            className={styles.joystickKnob}
            style={{
              transform: `translate(${knob.x}px, ${knob.y}px)`,
            }}
          />
        </div>
      </div>

      <div className={styles.rightControls}>
        <div className={styles.controlCaption}>ACTION</div>
        <button
          type="button"
          className={styles.jumpButton}
          onPointerDown={(event) => {
            event.preventDefault();
            onJump();
          }}
          aria-label="Jump"
        >
          <span className={styles.jumpArrow}>↑</span>
          <span>JUMP</span>
        </button>
      </div>
    </div>
  );
}
