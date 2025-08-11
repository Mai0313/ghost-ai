import React, { useEffect, useState } from 'react';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o-mini');

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
      <button onClick={onSave} style={{ marginTop: 8 }}>Save</button>
    </div>
  );
}


