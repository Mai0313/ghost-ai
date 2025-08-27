import React from "react";

export function RecordIndicator({ active }: { active: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: active ? "#ff6b6b" : "#aaa",
        fontWeight: 600,
      }}
    >
      <span style={{ fontSize: 18 }}>{active ? "●" : "○"}</span>
      <span>{active ? "Recording" : "Idle"}</span>
    </div>
  );
}
