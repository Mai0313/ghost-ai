import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Settings } from './components/Settings';
import {
  IconEyeOff,
  IconGear,
  IconMicOff,
  IconSend,
  IconText,
  IconWaveBars,
  IconX,
} from './components/Icons';

// Window.ghostAI types are declared in src/renderer/global.d.ts

function App() {
  const [visible, setVisible] = useState<boolean>(true);
  const [text, setText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('Describe what you see.');
  const [result, setResult] = useState('');
  const [tab, setTab] = useState<'ask' | 'settings'>('ask');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    // Guard in case preload failed; avoid crashing when window.ghostAI is undefined
    (window as any).ghostAI?.onTextInputShow?.(() => setVisible(true));
  }, []);

  useEffect(() => {
    (window as any).ghostAI?.onAudioToggle?.(() => setRecording((prev) => !prev));
  }, []);

  useEffect(() => {
    if (recording) {
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        setElapsedMs((ms) => ms + 1000);
      }, 1000) as unknown as number;
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

          mediaStreamRef.current = stream;
          recordedChunksRef.current = [];
          const mr = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : 'audio/webm',
          });

          mediaRecorderRef.current = mr;
          mr.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
          };
          mr.start();
        } catch (err) {
          console.error('Mic permission / recording error', err);
          setRecording(false);
          alert('Microphone permission denied or unavailable.');
        }
      })();
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [recording]);

  useEffect(() => {
    if (!recording) {
      const mr = mediaRecorderRef.current;

      if (mr && mr.state !== 'inactive') {
        mr.onstop = async () => {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || 'audio/webm' });
            const arrayBuffer = await blob.arrayBuffer();

            setBusy(true);
            const tr = await (window as any).ghostAI?.transcribeAudio?.(arrayBuffer);

            if (tr?.text) {
              // Place transcription into prompt for convenience
              setText((prev) => (prev ? prev + '\n' + tr.text : tr.text));
            }
          } catch (e) {
            console.error('Transcription failed', e);
          } finally {
            setBusy(false);
          }
        };
        mr.stop();
      }
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) track.stop();
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
    }
  }, [recording]);

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

  const timeLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, [elapsedMs]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: visible ? 'block' : 'none',
        pointerEvents: 'none',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
    >
      {/* Top center control bar */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(30,30,30,0.92)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}
        >
          {/* Left primary pill */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              borderRadius: 999,
              padding: '9px 12px',
              background: recording ? 'rgba(255,40,40,0.9)' : '#2B66F6',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title={recording ? 'Stop recording' : 'Start recording'}
            onClick={() => setRecording((r) => !r)}
          >
            {recording ? <IconMicOff color="white" /> : <IconWaveBars />}
            {recording ? timeLabel : 'Listen'}
          </button>

          {/* Ask */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: tab === 'ask' ? 'white' : '#BDBDBD',
              border: 'none',
              padding: '9px 12px',
              borderRadius: 999,
              cursor: 'pointer',
            }}
            onClick={() => setTab('ask')}
          >
            <IconText color={tab === 'ask' ? 'white' : '#BDBDBD'} />
            Ask
          </button>

          {/* Hide */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: '#BDBDBD',
              border: 'none',
              padding: '9px 10px',
              borderRadius: 999,
              cursor: 'pointer',
            }}
            onClick={() => setVisible(false)}
          >
            <IconEyeOff />
            Hide
          </button>

          {/* Separator dot menu for future actions */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              color: '#BDBDBD',
              border: 'none',
              padding: '8px 8px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
            title="Settings"
            onClick={() => setTab('settings')}
          >
            <IconGear />
          </button>
        </div>
      </div>

      {/* Bubble panel beneath top bar */}
      <div
        style={{
          position: 'absolute',
          top: 76,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 760,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            display: tab === 'settings' ? 'block' : 'none',
            background: 'rgba(20,20,20,0.92)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Settings</div>
            <button
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              title="Close"
              onClick={() => setTab('ask')}
            >
              <IconX />
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <Settings />
          </div>
        </div>

        {/* Ask / Response bubble */}
        <div
          style={{
            display: tab === 'ask' ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 12,
            background: 'rgba(28,28,28,0.94)',
            color: 'white',
            borderRadius: 16,
            padding: 14,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>AI Response</div>
            <button
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              title="Hide"
              onClick={() => setVisible(false)}
            >
              <IconX />
            </button>
          </div>

          {!!result && (
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: 12,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
              }}
            >
              {result}
            </div>
          )}

          {/* Prompt composer */}
          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="ask-prompt" style={{ color: '#BDBDBD', fontSize: 12 }}>
              Prompt
            </label>
            <textarea
              id="ask-prompt"
              placeholder="Ask about your screen..."
              rows={3}
              style={{
                width: '100%',
                background: '#141414',
                color: 'white',
                borderRadius: 10,
                padding: 10,
                border: '1px solid #2a2a2a',
                outline: 'none',
                resize: 'vertical',
              }}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <label htmlFor="ask-custom" style={{ color: '#BDBDBD', fontSize: 12 }}>
              Custom Prompt
            </label>
            <input
              id="ask-custom"
              style={{
                width: '100%',
                background: '#141414',
                color: 'white',
                borderRadius: 10,
                padding: 10,
                border: '1px solid #2a2a2a',
                outline: 'none',
              }}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                disabled={busy || !text}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  background: busy || !text ? '#2b66f666' : '#2B66F6',
                  color: 'white',
                  cursor: busy || !text ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
                onClick={onSubmit}
              >
                {busy ? 'Analyzing…' : 'Send'}
                {!busy && <IconSend />}
              </button>
              <button
                disabled={!result}
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: '#E6E6E6',
                  padding: '9px 12px',
                  borderRadius: 10,
                  cursor: result ? 'pointer' : 'not-allowed',
                }}
                onClick={() => navigator.clipboard.writeText(result || '')}
              >
                Copy response
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);

root.render(<App />);
