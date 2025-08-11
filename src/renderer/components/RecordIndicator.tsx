import React from 'react';

export function RecordIndicator({ active }: { active: boolean }) {
  return (
    <div style={{ color: active ? '#ff6b6b' : '#aaa' }}>{active ? '● Recording' : '○ Idle'}</div>
  );
}
