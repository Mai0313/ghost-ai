import React, { useEffect, useState, useCallback, useRef } from "react";

import { IconCheckCircle, IconXCircle } from "./Icons";

export function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  // Loading states
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  // Transcription language
  const [transcribeLanguage, setTranscribeLanguage] = useState<"en" | "zh">(
    "en",
  );
  // Attach screenshot with each Ask
  const [attachScreenshot, setAttachScreenshot] = useState<boolean>(true);
  // Prompts manager state
  const [promptNames, setPromptNames] = useState<string[]>([]);
  const [defaultPrompt, setDefaultPrompt] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  
  // Refs for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastApiKeyRef = useRef<string>("");
  const lastBaseURLRef = useRef<string>("");

  // Optimized config loading with better error handling
  const loadOpenAIConfigAndModels = useCallback(async (showLoading = false) => {
    const api: any = (window as any).ghostAI;
    if (!api) return;

    try {
      if (showLoading) setLoadingModels(true);
      
      const [cfg, list] = await Promise.all([
        api.getOpenAIConfig?.(),
        api.listOpenAIModels?.(),
      ]);

      if (cfg) {
        setApiKey(cfg.apiKey || "");
        setBaseURL(cfg.baseURL || "https://api.openai.com/v1");
        lastApiKeyRef.current = cfg.apiKey || "";
        lastBaseURLRef.current = cfg.baseURL || "https://api.openai.com/v1";
      }

      if (Array.isArray(list) && list.length) {
        setModels(list);
        const cfgModel = (cfg && (cfg as any).model) || "";
        
        if (cfgModel && list.includes(cfgModel)) {
          setModel(cfgModel);
        } else if (list.length > 0) {
          setModel(list[0]);
        } else {
          setModel("");
        }
      }
    } catch (error) {
      console.warn("Failed to load OpenAI config and models:", error);
    } finally {
      if (showLoading) setLoadingModels(false);
    }
  }, []);

  const loadUserSettingsAndPrompts = useCallback(async () => {
    const api: any = (window as any).ghostAI;
    if (!api) return;

    try {
      const [userSettings, promptsInfo, activePromptName] = await Promise.all([
        api.getUserSettings?.(),
        api.listPrompts?.(),
        api.getActivePromptName?.(),
      ]);

      // Set transcription language
      const lang = (userSettings && (userSettings as any).transcribeLanguage) || "en";
      setTranscribeLanguage(lang === "zh" ? "zh" : "en");
      
      // Set screenshot attachment setting
      const v = userSettings && (userSettings as any).attachScreenshot;
      setAttachScreenshot(typeof v === "boolean" ? v : true);
      
      // Set prompts
      if (promptsInfo && Array.isArray(promptsInfo.prompts)) {
        setPromptNames(promptsInfo.prompts);
        const current = (typeof activePromptName === "string" && activePromptName) ||
                       promptsInfo.defaultPrompt || null;
        setDefaultPrompt(current);
        const initial = current || promptsInfo.prompts[0] || null;
        setSelectedPrompt(initial);
      }
    } catch (error) {
      console.warn("Failed to load user settings and prompts:", error);
    }
  }, []);

  // Initial load with loading state
  useEffect(() => {
    const api: any = (window as any).ghostAI;
    if (!api) return;

    const initializeSettings = async () => {
      setLoadingConfig(true);
      try {
        await Promise.all([
          loadOpenAIConfigAndModels(),
          loadUserSettingsAndPrompts(),
        ]);
      } finally {
        setLoadingConfig(false);
      }
    };

    void initializeSettings();

    // Listen for config updates
    const offOpenAI = (() => {
      try {
        return api.onOpenAIConfigUpdated?.(() => {
          void loadOpenAIConfigAndModels(true);
        });
      } catch {}
      return undefined;
    })();

    return () => {
      try {
        if (typeof offOpenAI === "function") offOpenAI();
      } catch {}
    };
  }, [loadOpenAIConfigAndModels, loadUserSettingsAndPrompts]);

  const onSave = async () => {
    const api: any = (window as any).ghostAI;

    if (!api) return alert("Preload not ready. Please restart the app.");
    await api.updateOpenAIConfig({ apiKey, baseURL, model } as any);
    try {
      await api.updateUserSettings?.({ transcribeLanguage, attachScreenshot });
    } catch {}
    alert("Saved OpenAI settings");
  };

  // Debounced model refresh when API key or base URL changes
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Skip if values haven't actually changed
    if (apiKey === lastApiKeyRef.current && baseURL === lastBaseURLRef.current) {
      return;
    }

    // Skip if either field is empty
    if (!apiKey.trim() || !baseURL.trim()) {
      return;
    }

    // Set debounced timeout
    debounceTimeoutRef.current = setTimeout(async () => {
      const api: any = (window as any).ghostAI;
      if (!api) return;

      try {
        setLoadingModels(true);
        
        // Update in-memory client without persisting to disk yet
        await api.updateOpenAIConfigVolatile({ apiKey, baseURL } as any);
        const list = await api.listOpenAIModels();

        if (Array.isArray(list) && list.length) {
          setModels(list);
          // If current model is empty or not in list, auto-pick first
          if (!model || !list.includes(model)) {
            setModel(list[0] ?? "");
          }
        }
        
        // Update refs to track changes
        lastApiKeyRef.current = apiKey;
        lastBaseURLRef.current = baseURL;
      } catch (error) {
        console.warn("Failed to refresh models:", error);
      } finally {
        setLoadingModels(false);
      }
    }, 800); // 800ms debounce

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [apiKey, baseURL, model]);

  const onTest = async () => {
    setTesting(true);
    setOk(null);
    try {
      const api: any = (window as any).ghostAI;

      if (!api) throw new Error("Preload not ready");
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

  // Show loading state during initial config load
  if (loadingConfig) {
    return (
      <div style={{ color: "white", textAlign: "center", padding: "20px" }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: "white" }}>
      <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
        OpenAI Settings
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <label
          htmlFor="openai-api-key"
          style={{ fontSize: 12, color: "#BDBDBD" }}
        >
          API Key
        </label>
        <input
          id="openai-api-key"
          style={{
            background: "#141414",
            border: "1px solid #2a2a2a",
            color: "white",
            padding: "10px 12px",
            borderRadius: 10,
            outline: "none",
          }}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />

        <label
          htmlFor="openai-base-url"
          style={{ fontSize: 12, color: "#BDBDBD" }}
        >
          Base URL
        </label>
        <input
          id="openai-base-url"
          style={{
            background: "#141414",
            border: "1px solid #2a2a2a",
            color: "white",
            padding: "10px 12px",
            borderRadius: 10,
            outline: "none",
          }}
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
        />

        <label
          htmlFor="openai-model"
          style={{ fontSize: 12, color: "#BDBDBD" }}
        >
          Model
        </label>
        <select
          id="openai-model"
          style={{
            background: "#141414",
            border: "1px solid #2a2a2a",
            color: "white",
            padding: "10px 12px",
            borderRadius: 10,
            outline: "none",
          }}
          value={model}
          onChange={async (e) => {
            const val = (e.target as HTMLSelectElement).value;

            // Only update if the value actually changed
            if (val === model) return;

            setModel(val);
            try {
              const api: any = (window as any).ghostAI;

              // Update both volatile and persistent config
              await Promise.all([
                api?.updateOpenAIConfigVolatile?.({ model: val }),
                api?.updateOpenAIConfig?.({ model: val })
              ]);
            } catch (error) {
              console.warn("Failed to update model:", error);
            }
          }}
        >
          {(!models.length || !model) && (
            <option disabled value="">
              {loadingModels ? "Loading models…" : models.length ? "Select a model" : "No models available"}
            </option>
          )}
          {models.map((m) => (
            <option key={m} style={{ background: "#141414" }} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          marginTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 12,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          Transcription
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <label
            htmlFor="transcribe-language"
            style={{ fontSize: 12, color: "#BDBDBD" }}
          >
            Language
          </label>
          <select
            id="transcribe-language"
            style={{
              background: "#141414",
              border: "1px solid #2a2a2a",
              color: "white",
              padding: "10px 12px",
              borderRadius: 10,
              outline: "none",
              width: "100%",
            }}
            value={transcribeLanguage}
            onChange={(e) =>
              setTranscribeLanguage((e.target.value as "en" | "zh") || "en")
            }
          >
            <option style={{ background: "#141414" }} value="en">
              English (en)
            </option>
            <option style={{ background: "#141414" }} value="zh">
              中文 (zh)
            </option>
          </select>
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 12,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          Screenshots
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            checked={attachScreenshot}
            id="attach-screenshot"
            type="checkbox"
            onChange={(e) => setAttachScreenshot(!!e.target.checked)}
          />
          <label
            htmlFor="attach-screenshot"
            style={{ fontSize: 12, color: "#BDBDBD" }}
          >
            Attach a screenshot with each Ask
          </label>
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 12,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          Prompts
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <label
            htmlFor="prompt-select"
            style={{ fontSize: 12, color: "#BDBDBD" }}
          >
            Default prompt file (stored under ~/.ghost-ai/prompts){" "}
            {defaultPrompt ? `— current: ${defaultPrompt}` : ""}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              id="prompt-select"
              style={{
                background: "#141414",
                border: "1px solid #2a2a2a",
                color: "white",
                padding: "10px 12px",
                borderRadius: 10,
                outline: "none",
                flex: 1,
              }}
              value={selectedPrompt || ""}
              onChange={async (e) => {
                const name = e.target.value || null;

                setSelectedPrompt(name);
                try {
                  if (name) {
                    const ret = await (
                      window as any
                    ).ghostAI?.setActivePromptName?.(name);

                    setDefaultPrompt(ret || name);
                  }
                } catch {}
              }}
            >
              {(!promptNames.length || !selectedPrompt) && (
                <option disabled value="">
                  {promptNames.length ? "Select a prompt" : "No prompts found"}
                </option>
              )}
              {promptNames.map((n) => (
                <option key={n} style={{ background: "#141414" }} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          style={{
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            background: "#2B66F6",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={onSave}
        >
          Save
        </button>
        <button
          disabled={testing}
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "#E6E6E6",
            padding: "10px 14px",
            borderRadius: 10,
            cursor: testing ? "not-allowed" : "pointer",
          }}
          onClick={onTest}
        >
          {testing ? "Testing…" : "Test"}
        </button>
        <button
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "#ff4d4f",
            padding: "10px 14px",
            borderRadius: 10,
            cursor: "pointer",
          }}
          onClick={() => (window as any).ghostAI?.quitApp?.()}
        >
          Quit Ghost
        </button>
        {ok !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 12px",
              background: ok
                ? "rgba(82, 196, 26, 0.1)"
                : "rgba(255, 77, 79, 0.1)",
              borderRadius: 8,
              border: `1px solid ${ok ? "rgba(82, 196, 26, 0.3)" : "rgba(255, 77, 79, 0.3)"}`,
              gap: 8,
              alignSelf: "center",
            }}
          >
            {ok ? <IconCheckCircle /> : <IconXCircle />}
            <span
              style={{ color: ok ? "#52c41a" : "#ff4d4f", fontWeight: 500 }}
            >
              {ok ? "Valid" : "Invalid"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
