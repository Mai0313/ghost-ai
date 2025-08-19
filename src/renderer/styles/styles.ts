import type { CSSProperties } from 'react';

import { theme } from './theme';

export const appRootStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'block',
  pointerEvents: 'none',
  fontFamily: theme.fontFamily,
};

export const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: theme.color.barBg(),
  border: `1px solid ${theme.color.border()}`,
  borderRadius: 12,
  padding: 6,
  boxShadow: theme.shadow.bar(),
  pointerEvents: 'auto',
};

export const pillButton = (
  options: { primary?: boolean; danger?: boolean } = {},
): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  borderRadius: 999,
  padding: '9px 12px',
  background: options.primary
    ? theme.color.primary(1, 1)
    : options.danger
      ? theme.color.danger(1, 1)
      : 'transparent',
  color: theme.color.text(1),
  fontWeight: 600,
  cursor: 'pointer',
});

export const ghostButton: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'transparent',
  color: theme.color.muted(),
  border: 'none',
  padding: '9px 12px',
  borderRadius: 999,
  cursor: 'pointer',
};

export const iconButton: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  color: theme.color.muted(),
  border: 'none',
  padding: '8px 8px',
  borderRadius: 8,
  cursor: 'pointer',
};

export const settingsCard: CSSProperties = {
  background: theme.color.settingsBg(),
  color: theme.color.text(),
  border: `1px solid ${theme.color.border()}`,
  borderRadius: 16,
  padding: 16,
  boxShadow: theme.shadow.panel(),
};

export const askCard: CSSProperties = {
  width: 760,
  background: theme.color.panelBg(),
  color: theme.color.text(),
  border: `1px solid ${theme.color.border()}`,
  borderRadius: 16,
  boxShadow: theme.shadow.panel(),
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

export const askResultArea: CSSProperties = {
  padding: 12,
  whiteSpace: 'pre-wrap',
  lineHeight: 1.4,
  maxHeight: '50vh',
  overflowY: 'auto',
  // Semi-transparent background similar to panels
  background: theme.color.panelBg(),
};

export const askFooter: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: 10,
  borderTop: `1px solid ${theme.color.border()}`,
  background: theme.color.panelFooterBg(),
};

export const askInput: CSSProperties = {
  flex: 1,
  background: theme.color.inputBg(),
  color: theme.color.text(),
  borderRadius: 10,
  padding: '10px 12px',
  border: '1px solid #2a2a2a',
  outline: 'none',
};
