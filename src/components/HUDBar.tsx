import React, { useRef } from "react";

import {
  barStyle,
  ghostButton,
  iconButton,
  pillButton,
} from "../styles/styles";
import { theme } from "../styles/theme";

import {
  IconEyeOff,
  IconGear,
  IconMicOff,
  IconText,
  IconWaveBars,
} from "./Icons";

type HUDBarProps = {
  barRef: React.RefObject<HTMLDivElement>;
  barPos: { x: number; y: number };
  setBarPos: (pos: { x: number; y: number }) => void;
  recording: boolean;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  setRecording: React.Dispatch<React.SetStateAction<boolean>>;
  timeLabel: string;
  askActive: boolean;
  onAskToggle: () => void;
  onSettingsToggle: () => void;
};

export const HUDBar: React.FC<HUDBarProps> = ({
  barRef,
  barPos,
  setBarPos,
  recording,
  paused,
  setPaused,
  setRecording,
  timeLabel,
  askActive,
  onAskToggle,
  onSettingsToggle,
}) => {
  const dragStateRef = useRef<{ offsetX: number; offsetY: number } | null>(
    null,
  );

  return (
    <div
      ref={barRef}
      style={{
        position: "absolute",
        top: barPos.y,
        left: barPos.x,
        ...barStyle,
      }}
      onPointerEnter={() => (window as any).ghostAI?.setMouseIgnore?.(false)}
      onPointerLeave={() => (window as any).ghostAI?.setMouseIgnore?.(true)}
    >
      <div
        style={{
          width: 12,
          cursor: "move",
          alignSelf: "stretch",
          marginRight: 4,
        }}
        title="Drag"
        onPointerDown={(e) => {
          const rect = barRef.current?.getBoundingClientRect();

          if (!rect) return;
          (window as any).ghostAI?.setMouseIgnore?.(false);
          dragStateRef.current = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
          };
          const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - (dragStateRef.current?.offsetX ?? 0);
            const dy = ev.clientY - (dragStateRef.current?.offsetY ?? 0);
            const width = barRef.current?.offsetWidth ?? 320;
            const height = barRef.current?.offsetHeight ?? 40;
            const clampedX = Math.min(
              Math.max(0, dx),
              window.innerWidth - width,
            );
            const clampedY = Math.min(
              Math.max(0, dy),
              window.innerHeight - height,
            );

            setBarPos({ x: clampedX, y: clampedY });
          };
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            dragStateRef.current = null;
            const el = barRef.current;
            const leaveToIgnore = () =>
              (window as any).ghostAI?.setMouseIgnore?.(true);

            if (el && el.matches(":hover")) {
              (window as any).ghostAI?.setMouseIgnore?.(false);
            } else {
              leaveToIgnore();
            }
          };

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp, { once: true });
        }}
      />
      {!recording && (
        <button
          style={pillButton({ primary: true, danger: false })}
          title={"Start recording"}
          onClick={() => setRecording(true)}
        >
          <IconWaveBars />
          Listen
        </button>
      )}
      {recording && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            style={pillButton({ primary: !paused, danger: paused })}
            title={paused ? "Resume" : "Pause"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            style={pillButton({ primary: false, danger: true })}
            title={"Stop recording"}
            onClick={() => {
              setRecording(false);
              setPaused(false);
            }}
          >
            <IconMicOff color={theme.color.text()} />
            {timeLabel}
          </button>
        </div>
      )}

      <button
        style={{
          ...ghostButton,
          color: askActive ? theme.color.text() : theme.color.muted(),
        }}
        onClick={onAskToggle}
      >
        <IconText
          color={askActive ? theme.color.text() : theme.color.muted()}
        />
        Ask
      </button>

      <button
        style={ghostButton}
        onClick={() => {
          (window as any).ghostAI?.toggleHide?.();
        }}
      >
        <IconEyeOff />
        Hide
      </button>

      <div style={{ flex: 1 }} />

      <button style={iconButton} title="Settings" onClick={onSettingsToggle}>
        <IconGear />
      </button>
    </div>
  );
};
