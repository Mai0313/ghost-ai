import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings } from './components/Settings';
import { RecordIndicator } from './components/RecordIndicator';

declare global {
  interface Window {
    ghostAI: {
      updateOpenAIConfig: (cfg: Partial<any>) => Promise<boolean>;
      getOpenAIConfig: () => Promise<any>;
      analyzeCurrentScreen: (textPrompt: string, customPrompt: string) => Promise<{ content: string }>;
      onTextInputShow: (handler: () => void) => void;
      onAudioToggle: (handler: () => void) => void;
    };
  }
}

function App() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('Describe what you see.');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    window.ghostAI.onTextInputShow(() => setVisible(true));
  }, []);

  useEffect(() => {
    window.ghostAI.onAudioToggle(() => setRecording(prev => !prev));
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
    <div style={{
      position: 'fixed', inset: 0, display: visible ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{ width: 720, padding: 16, borderRadius: 12, background: 'rgba(20,20,20,0.85)', color: 'white' }}>
        <h3 style={{ marginTop: 0 }}>Ghost AI</h3>
        <label>Prompt</label>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ask about your screen..." rows={3} style={{ width: '100%', marginBottom: 8 }} />
        <label>Custom Prompt</label>
        <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={busy || !text} onClick={onSubmit}>{busy ? 'Analyzing…' : 'Analyze current screen'}</button>
          <button onClick={() => setVisible(false)}>Hide</button>
          <RecordIndicator active={recording} />
        </div>
        {!!result && (
          <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{result}</pre>
        )}
        <div style={{ marginTop: 16 }}>
          <Settings />
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);


