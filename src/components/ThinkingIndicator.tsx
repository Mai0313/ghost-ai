import React from 'react';

import { theme } from '../styles/theme';

export function ThinkingIndicator({ size = 10, dots = 3 }: { size?: number; dots?: number }) {
  const items = new Array(Math.max(1, Math.min(6, dots))).fill(0);

  return (
    <div
      aria-label="Thinking"
      className="thinking-dots"
      role="status"
      style={{ color: theme.color.primary(1, 1) }}
      title="Thinking"
    >
      {items.map((_, idx) => (
        <span key={idx} style={{ width: size, height: size }} />
      ))}
    </div>
  );
}


