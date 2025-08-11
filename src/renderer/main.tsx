import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings } from './components/Settings';
import { RecordIndicator } from './components/RecordIndicator';
import { IconEyeOff, IconGear, IconText, IconWaveBars } from './components/Icons';

// Window.ghostAI types are declared in src/renderer/global.d.ts

function App() {
  const [visible, setVisible] = useState<boolean>(import.meta.env.DEV);
  const [text, setText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('Describe what you see.');
  const [result, setResult] = useState('');
  const [tab, setTab] = useState<'ask' | 'settings'>('ask');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    window.ghostAI.onTextInputShow(() => setVisible(true));
  }, []);

  useEffect(() => {
    window.ghostAI.onAudioToggle(() => setRecording((prev) => !prev));
  }, []);

  const onSubmit = useCallback(async () => {
    if (!text) return;
    setBusy(true);
    try {
      const res = await window.ghostAI.analyzeCurrentScreen(text, customPrompt);
      setResult(res.content ?? '');
    } finally {
      setBusy(false);
    }
  }, [text, customPrompt]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: visible ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* Floating bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 6,
            paddingLeft: 8,
            paddingRight: 8,
            borderRadius: 999,
            background: 'rgba(60,60,60,0.85)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          }}
        >
          {/* Listen button */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              borderRadius: 999,
              padding: '10px 14px',
              background: '#2B66F6',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <IconWaveBars />
            Listen
          </button>

          {/* Ask question */}
          <button
            onClick={() => setTab('ask')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: tab === 'ask' ? 'white' : '#D0D0D0',
              border: 'none',
              padding: '10px 12px',
              borderRadius: 999,
              cursor: 'pointer',
            }}
          >
            <IconText color={tab === 'ask' ? 'white' : '#D0D0D0'} />
            Ask question
          </button>

          {/* Hide */}
          <button
            onClick={() => setVisible(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: '#D0D0D0',
              border: 'none',
              padding: '10px 12px',
              borderRadius: 999,
              cursor: 'pointer',
            }}
          >
            <IconEyeOff />
            Hide
          </button>
        </div>

        {/* Settings round button */}
        <button
          onClick={() => setTab('settings')}
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 999,
            background: 'rgba(80,80,80,0.9)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          }}
        >
          <IconGear />
        </button>
      </div>

      {/* Panel */}
      <div
        style={{
          pointerEvents: 'auto',
          marginTop: 16,
          width: 740,
          padding: 16,
          borderRadius: 16,
          background: 'rgba(28,28,28,0.92)',
          color: 'white',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        {tab === 'ask' && (
          <div>
            <label style={{ color: '#BDBDBD', fontSize: 12 }}>Prompt</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about your screen..."
              rows={3}
              style={{
                width: '100%',
                marginBottom: 8,
                background: '#1c1c1c',
                color: 'white',
                borderRadius: 8,
                padding: 10,
                border: '1px solid #333',
              }}
            />
            <label style={{ color: '#BDBDBD', fontSize: 12 }}>Custom Prompt</label>
            <input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              style={{
                width: '100%',
                marginBottom: 8,
                background: '#1c1c1c',
                color: 'white',
                borderRadius: 8,
                padding: 10,
                border: '1px solid #333',
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                disabled={busy || !text}
                onClick={onSubmit}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
                  background: busy ? '#2b66f666' : '#2B66F6',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {busy ? 'Analyzing…' : 'Analyze current screen'}
              </button>
            </div>
            {!!result && <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{result}</pre>}
          </div>
        )}

        {tab === 'settings' && <Settings />}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
