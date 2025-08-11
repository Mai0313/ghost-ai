import React, { useEffect, useState } from 'react';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o-mini');
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const cfg = await window.ghostAI.getOpenAIConfig();
      if (cfg) {
        setApiKey(cfg.apiKey || '');
        setBaseURL(cfg.baseURL || 'https://api.openai.com/v1');
        setModel(cfg.model || 'gpt-4o-mini');
      }
    })();
  }, []);

  const onSave = async () => {
    await window.ghostAI.updateOpenAIConfig({ apiKey, baseURL, model });
    alert('Saved OpenAI settings');
  };

  const onTest = async () => {
    setTesting(true);
    setOk(null);
    try {
      const success = await window.ghostAI.validateOpenAIConfig({
        apiKey,
        baseURL,
        model,
        timeout: 60000,
        maxTokens: 1000,
        temperature: 0.7,
      } as any);
      setOk(success);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h4>OpenAI Settings</h4>
      <div style={{ display: 'grid', gap: 8 }}>
        <label>API Key</label>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />
        <label>Base URL</label>
        <input value={baseURL} onChange={e => setBaseURL(e.target.value)} />
        <label>Model</label>
        <input value={model} onChange={e => setModel(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onSave}>Save</button>
        <button onClick={onTest} disabled={testing}>{testing ? 'Testing…' : 'Test'}</button>
        {ok !== null && <span style={{ color: ok ? '#52c41a' : '#ff4d4f' }}>{ok ? 'Valid' : 'Invalid'}</span>}
      </div>
    </div>
  );
}


