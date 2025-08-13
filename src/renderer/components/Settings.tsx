import React, { useEffect, useState } from 'react';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    (async () => {
      const api: any = (window as any).ghostAI;

      if (!api) return;

      try {
        const [cfg, list] = await Promise.all([
          api.getOpenAIConfig(),
          api.listOpenAIModels(),
        ]);

        if (cfg) {
          setApiKey(cfg.apiKey || '');
          setBaseURL(cfg.baseURL || 'https://api.openai.com/v1');
          setCustomPrompt(cfg.customPrompt || '');
        }

        if (Array.isArray(list) && list.length) setModels(list);

        // Only set model after models are loaded; if cfg.model isn't in list, leave empty
        const cfgModel = (cfg && cfg.model) || '';
        if (cfgModel && Array.isArray(list) && list.includes(cfgModel)) {
          setModel(cfgModel);
        } else {
          setModel('');
        }
      } catch {}
    })();
  }, []);

  const onSave = async () => {
    const api: any = (window as any).ghostAI;

    if (!api) return alert('Preload not ready. Please restart the app.');
    await api.updateOpenAIConfig({ apiKey, baseURL, model, customPrompt } as any);
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
          id="openai-model"
          disabled={!models.length}
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
            <option value="" disabled>
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
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Custom Prompt</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="custom-prompt" style={{ fontSize: 12, color: '#BDBDBD' }}>
            Default custom prompt used with Ask
          </label>
          <textarea
            id="custom-prompt"
            rows={2}
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 10,
              outline: 'none',
              resize: 'vertical',
            }}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
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
