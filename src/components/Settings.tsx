import React, { useEffect, useState } from 'react';

import { IconCheckCircle, IconXCircle } from './Icons';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  // Transcription language
  const [transcribeLanguage, setTranscribeLanguage] = useState<'en' | 'zh'>('en');
  // Prompts manager state
  const [promptNames, setPromptNames] = useState<string[]>([]);
  const [defaultPrompt, setDefaultPrompt] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const api: any = (window as any).ghostAI;

      if (!api) return;

      try {
        const [cfg, list, promptsInfo, userSettings] = await Promise.all([
          api.getOpenAIConfig(),
          api.listOpenAIModels(),
          api.listPrompts?.(),
          api.getUserSettings?.(),
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
        // Language
        try {
          const lang = (userSettings && (userSettings as any).transcribeLanguage) || 'en';

          setTranscribeLanguage(lang === 'zh' ? 'zh' : 'en');
        } catch {}
        // Prompts
        if (promptsInfo && Array.isArray(promptsInfo.prompts)) {
          setPromptNames(promptsInfo.prompts);
          setDefaultPrompt(promptsInfo.defaultPrompt || null);
          const initial = promptsInfo.defaultPrompt || promptsInfo.prompts[0] || null;

          setSelectedPrompt(initial);
        }
      } catch {}
    })();
  }, []);

  const onSave = async () => {
    const api: any = (window as any).ghostAI;

    if (!api) return alert('Preload not ready. Please restart the app.');
    await api.updateOpenAIConfig({ apiKey, baseURL, model } as any);
    try {
      await api.updateUserSettings?.({ transcribeLanguage });
    } catch {}
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

        {/* Model selection moved next to Ask input. Keep internal state for Test, but hide UI here. */}
      </div>
      <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Transcription</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="transcribe-language" style={{ fontSize: 12, color: '#BDBDBD' }}>
            Language
          </label>
          <select
            id="transcribe-language"
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 10,
              outline: 'none',
              width: '100%',
            }}
            value={transcribeLanguage}
            onChange={(e) => setTranscribeLanguage((e.target.value as 'en' | 'zh') || 'en')}
          >
            <option style={{ background: '#141414' }} value="en">
              English (en)
            </option>
            <option style={{ background: '#141414' }} value="zh">
              中文 (zh)
            </option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Prompts</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="prompt-select" style={{ fontSize: 12, color: '#BDBDBD' }}>
            Default prompt file (stored under ~/.ghost-ai/prompts){' '}
            {defaultPrompt ? `— current: ${defaultPrompt}` : ''}
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
                try {
                  if (name) {
                    const ret = await (window as any).ghostAI?.setDefaultPrompt?.(name);

                    setDefaultPrompt(ret || 'default.txt');
                  }
                } catch {}
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
        <button
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent',
            color: '#ff4d4f',
            padding: '10px 14px',
            borderRadius: 10,
            cursor: 'pointer',
          }}
          onClick={() => (window as any).ghostAI?.quitApp?.()}
        >
          Quit Ghost
        </button>
        {ok !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              background: ok ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
              borderRadius: 8,
              border: `1px solid ${ok ? 'rgba(82, 196, 26, 0.3)' : 'rgba(255, 77, 79, 0.3)'}`,
              gap: 8,
              alignSelf: 'center',
            }}
          >
            {ok ? <IconCheckCircle /> : <IconXCircle />}
            <span style={{ color: ok ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
              {ok ? 'Valid' : 'Invalid'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


