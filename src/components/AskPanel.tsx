import React, { useEffect, useMemo, useRef, useState } from 'react';

import { askCard, askFooter, askInput, askResultArea, ghostButton } from '../styles/styles';

import { MarkdownViewer } from './MarkdownViewer';
import { ThinkingIndicator } from './ThinkingIndicator';

type AskPanelProps = {
  displayMarkdown: string;
  hasPages: boolean;
  currentPageLabel: string;
  historyIndex: number | null;
  gotoPrevPage: () => void;
  gotoNextPage: () => void;
  canRegenerate: boolean;
  onRegenerate: () => void;
  busy: boolean;
  streaming: boolean;
  text: string;
  setText: (val: string) => void;
  onSubmit: () => void;
  inputRef?: React.RefObject<HTMLInputElement> | null;
};

export const AskPanel: React.FC<AskPanelProps> = ({
  displayMarkdown,
  hasPages,
  currentPageLabel,
  historyIndex,
  gotoPrevPage,
  gotoNextPage,
  canRegenerate,
  onRegenerate,
  busy,
  streaming,
  text,
  setText,
  onSubmit,
  inputRef,
}) => {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>('');
  const [composing, setComposing] = useState(false);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const askInputRef = inputRef ?? localInputRef;

  useEffect(() => {
    (async () => {
      try {
        const api: any = (window as any).ghostAI;

        if (!api) return;
        const [cfg, list] = await Promise.all([api.getOpenAIConfig?.(), api.listOpenAIModels?.()]);

        if (Array.isArray(list) && list.length) setModels(list);
        const cfgModel = (cfg && (cfg as any).model) || '';

        if (cfgModel && Array.isArray(list) && list.includes(cfgModel)) setModel(cfgModel);
        else setModel('');
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const api: any = (window as any).ghostAI;

    if (!api?.onOpenAIConfigUpdated) return;
    const off = api.onOpenAIConfigUpdated(async () => {
      try {
        const [cfg, list] = await Promise.all([api.getOpenAIConfig?.(), api.listOpenAIModels?.()]);

        if (Array.isArray(list) && list.length) setModels(list);
        const cfgModel = (cfg && (cfg as any).model) || '';

        if (cfgModel && Array.isArray(list) && list.includes(cfgModel)) setModel(cfgModel);
        else if (Array.isArray(list) && list.length) setModel(list[0] ?? '');
      } catch {}
    });

    return () => {
      try {
        off && off();
      } catch {}
    };
  }, []);

  const markdownVisible = useMemo(() => (displayMarkdown ? 'block' : 'none'), [displayMarkdown]);

  return (
    <div style={askCard}>
      <div
        className="bn-markdown-viewer"
        style={{
          ...askResultArea,
          whiteSpace: 'normal',
          display: markdownVisible,
        }}
      >
        <MarkdownViewer markdown={displayMarkdown} />
      </div>
      <div style={askFooter}>
        {hasPages && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
            <button
              disabled={!hasPages || historyIndex === 0}
              style={ghostButton}
              title="Previous answer (Ctrl/Cmd+Shift+Up)"
              onClick={gotoPrevPage}
            >
              ◀ Prev
            </button>
            <div style={{ opacity: 0.8, fontSize: 12, minWidth: 48, textAlign: 'center' }}>
              {currentPageLabel}
            </div>
            <button
              disabled={!hasPages || historyIndex === null}
              style={ghostButton}
              title="Next answer / Latest (Ctrl/Cmd+Shift+Down)"
              onClick={gotoNextPage}
            >
              Next ▶
            </button>
            {canRegenerate && (
              <button
                style={ghostButton}
                title="Regenerate this answer (re-sends the same question using only prior context)"
                onClick={() => void onRegenerate()}
              >
                ↻ Regenerate
              </button>
            )}
          </div>
        )}
        {(busy || streaming) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
            <ThinkingIndicator dots={4} size={8} />
          </div>
        )}
        <input
          ref={askInputRef}
          disabled={busy || streaming}
          id="ask-input"
          placeholder={'Press Enter to ask with default prompt…'}
          style={askInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onCompositionEnd={() => setComposing(false)}
          onCompositionStart={() => setComposing(true)}
          onKeyDown={(e) => {
            if ((e as any).key === 'Enter' && !(e as any).shiftKey && !composing) {
              e.preventDefault();
              if (!busy) void onSubmit();
            }
          }}
        />
        <select
          disabled={busy || streaming || !models.length}
          id="ask-model-select"
          style={{
            background: '#141414',
            border: '1px solid #2a2a2a',
            color: 'white',
            padding: '10px 12px',
            borderRadius: 10,
            outline: 'none',
            maxWidth: 220,
          }}
          value={model}
          onChange={async (e) => {
            const val = (e.target as HTMLSelectElement).value;

            setModel(val);
            try {
              const api: any = (window as any).ghostAI;

              await api?.updateOpenAIConfigVolatile?.({ model: val });
              await api?.updateOpenAIConfig?.({ model: val });
            } catch {}
          }}
        >
          {(!models.length || !model) && (
            <option disabled value="">
              {models.length ? 'Select a model' : 'Loading models…'}
            </option>
          )}
          {models.map((m) => (
            <option key={m} style={{ background: '#141414' }} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};


