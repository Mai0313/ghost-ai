import React, { useEffect, useState } from 'react';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  // Prompts manager state
  const [promptNames, setPromptNames] = useState<string[]>([]);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState<string>('');
  const [newPromptName, setNewPromptName] = useState<string>('');
  const [loadingPrompt, setLoadingPrompt] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const api: any = (window as any).ghostAI;

      if (!api) return;

      try {
        const [cfg, list, promptsInfo] = await Promise.all([
          api.getOpenAIConfig(),
          api.listOpenAIModels(),
          api.listPrompts?.(),
        ]);

        if (cfg) {
          setApiKey(cfg.apiKey || '');
          setBaseURL(cfg.baseURL || 'https://api.openai.com/v1');
        }

        if (Array.isArray(list) && list.length) setModels(list);

        // Only set model after models are loaded; if cfg.model isn't in list, leave empty
        const cfgModel = (cfg && cfg.model) || '';

        if (cfgModel && Array.isArray(list) && list.includes(cfgModel)) {
          setModel(cfgModel);
        } else {
          setModel('');
        }
        // Prompts
        if (promptsInfo && Array.isArray(promptsInfo.prompts)) {
          setPromptNames(promptsInfo.prompts);
          setActivePrompt(promptsInfo.active || null);
          const initial = promptsInfo.active || promptsInfo.prompts[0] || null;

          setSelectedPrompt(initial);
          if (initial) {
            try {
              const content = await api.readPrompt?.(initial);

              setPromptContent(content || '');
            } catch {}
          }
        }
      } catch {}
    })();
  }, []);

  const onSave = async () => {
    const api: any = (window as any).ghostAI;

    if (!api) return alert('Preload not ready. Please restart the app.');
    await api.updateOpenAIConfig({ apiKey, baseURL, model } as any);
    alert('Saved OpenAI settings');
  };

  // When API key or base URL changes, try to refresh models automatically
  useEffect(() => {
    (async () => {
      const api: any = (window as any).ghostAI;

      if (!api) return;
      if (!apiKey || !baseURL) return;
      try {
        // Update in-memory client without persisting to disk yet
        await api.updateOpenAIConfigVolatile({ apiKey, baseURL } as any);
        const list = await api.listOpenAIModels();

        if (Array.isArray(list) && list.length) {
          setModels(list);
          // If current model is empty or not in list, auto-pick first
          if (!model || !list.includes(model)) {
            setModel(list[0] ?? '');
          }
        }
      } catch {}
    })();
  }, [apiKey, baseURL]);

  const onTest = async () => {
    setTesting(true);
    setOk(null);
    try {
      const api: any = (window as any).ghostAI;

      if (!api) throw new Error('Preload not ready');
      const success = await api.validateOpenAIConfig({
        apiKey,
        baseURL,
        model,
        timeout: 60000,
      } as any);

      setOk(success);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ color: 'white' }}>
      <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>OpenAI Settings</div>
      <div style={{ display: 'grid', gap: 10 }}>
        <label htmlFor="openai-api-key" style={{ fontSize: 12, color: '#BDBDBD' }}>
          API Key
        </label>
        <input
          id="openai-api-key"
          style={{
            background: '#141414',
            border: '1px solid #2a2a2a',
            color: 'white',
            padding: '10px 12px',
            borderRadius: 10,
            outline: 'none',
          }}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />

        <label htmlFor="openai-base-url" style={{ fontSize: 12, color: '#BDBDBD' }}>
          Base URL
        </label>
        <input
          id="openai-base-url"
          style={{
            background: '#141414',
            border: '1px solid #2a2a2a',
            color: 'white',
            padding: '10px 12px',
            borderRadius: 10,
            outline: 'none',
          }}
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
        />

        <label htmlFor="openai-model" style={{ fontSize: 12, color: '#BDBDBD' }}>
          Model
        </label>
        <select
          disabled={!models.length}
          id="openai-model"
          style={{
            background: '#141414',
            border: '1px solid #2a2a2a',
            color: 'white',
            padding: '10px 12px',
            borderRadius: 10,
            outline: 'none',
          }}
          value={model}
          onChange={(e) => setModel(e.target.value)}
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
      <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Prompts</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="prompt-select" style={{ fontSize: 12, color: '#BDBDBD' }}>
            Active prompt file (stored under ~/.ghost_ai/prompts)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              id="prompt-select"
              style={{
                background: '#141414',
                border: '1px solid #2a2a2a',
                color: 'white',
                padding: '10px 12px',
                borderRadius: 10,
                outline: 'none',
                flex: 1,
              }}
              value={selectedPrompt || ''}
              onChange={async (e) => {
                const name = e.target.value || null;

                setSelectedPrompt(name);
                setLoadingPrompt(true);
                try {
                  const api: any = (window as any).ghostAI;

                  if (name) {
                    const content = await api.readPrompt?.(name);

                    setPromptContent(content || '');
                  } else {
                    setPromptContent('');
                  }
                } finally {
                  setLoadingPrompt(false);
                }
              }}
            >
              {(!promptNames.length || !selectedPrompt) && (
                <option disabled value="">
                  {promptNames.length ? 'Select a prompt' : 'No prompts found'}
                </option>
              )}
              {promptNames.map((n) => (
                <option key={n} style={{ background: '#141414' }} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: '#E6E6E6',
                padding: '10px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={async () => {
                if (!selectedPrompt) return alert('Select a prompt first');
                try {
                  await (window as any).ghostAI?.setActivePrompt?.(selectedPrompt);
                  setActivePrompt(selectedPrompt);
                  alert(`Active prompt set to ${selectedPrompt}`);
                } catch (e) {
                  alert('Failed to set active prompt');
                }
              }}
            >
              Set Active
            </button>
          </div>

          <label htmlFor="prompt-editor" style={{ fontSize: 12, color: '#BDBDBD' }}>
            Edit prompt content {activePrompt ? `(active: ${activePrompt})` : ''}
          </label>
          <textarea
            disabled={!selectedPrompt}
            id="prompt-editor"
            rows={6}
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 10,
              outline: 'none',
              resize: 'vertical',
              opacity: loadingPrompt ? 0.6 : 1,
            }}
            value={promptContent}
            onChange={(e) => setPromptContent(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={!selectedPrompt}
              style={{
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                background: '#2B66F6',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={async () => {
                if (!selectedPrompt) return;
                try {
                  const name = await (window as any).ghostAI?.writePrompt?.(
                    selectedPrompt,
                    promptContent,
                  );

                  if (name && !promptNames.includes(name)) setPromptNames((p) => [...p, name]);
                  alert('Prompt saved');
                } catch {
                  alert('Failed to save prompt');
                }
              }}
            >
              Save Prompt
            </button>
            <button
              disabled={!selectedPrompt}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: '#E6E6E6',
                padding: '10px 14px',
                borderRadius: 10,
                cursor: 'pointer',
              }}
              onClick={async () => {
                if (!selectedPrompt) return;
                if (!confirm(`Delete prompt ${selectedPrompt}?`)) return;
                try {
                  const ok = await (window as any).ghostAI?.deletePrompt?.(selectedPrompt);

                  if (ok) {
                    const next = promptNames.filter((n) => n !== selectedPrompt);

                    setPromptNames(next);
                    if (activePrompt === selectedPrompt) setActivePrompt(null);
                    setSelectedPrompt(next[0] || null);
                    setPromptContent('');
                  }
                } catch {}
              }}
            >
              Delete
            </button>
          </div>

          <label htmlFor="new-prompt-name" style={{ fontSize: 12, color: '#BDBDBD' }}>
            Create new prompt
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="new-prompt-name"
              placeholder="e.g. ui-review.txt"
              style={{
                background: '#141414',
                border: '1px solid #2a2a2a',
                color: 'white',
                padding: '10px 12px',
                borderRadius: 10,
                outline: 'none',
                flex: 1,
              }}
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
            />
            <button
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: '#E6E6E6',
                padding: '10px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={async () => {
                const name = (newPromptName || '').trim();

                if (!name) return alert('Enter a name');
                try {
                  const saved = await (window as any).ghostAI?.writePrompt?.(
                    name,
                    promptContent || '',
                  );

                  if (saved && !promptNames.includes(saved)) setPromptNames((p) => [...p, saved]);
                  setSelectedPrompt(saved || name);
                  setNewPromptName('');
                } catch {
                  alert('Failed to create prompt');
                }
              }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          style={{
            border: 'none',
            borderRadius: 10,
            padding: '10px 14px',
            background: '#2B66F6',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={onSave}
        >
          Save
        </button>
        <button
          disabled={testing}
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent',
            color: '#E6E6E6',
            padding: '10px 14px',
            borderRadius: 10,
            cursor: testing ? 'not-allowed' : 'pointer',
          }}
          onClick={onTest}
        >
          {testing ? 'Testing…' : 'Test'}
        </button>
        {ok !== null && (
          <span style={{ color: ok ? '#52c41a' : '#ff4d4f', alignSelf: 'center' }}>
            {ok ? 'Valid' : 'Invalid'}
          </span>
        )}
      </div>
    </div>
  );
}
