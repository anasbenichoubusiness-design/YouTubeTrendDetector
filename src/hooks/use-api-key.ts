"use client";

import { useState, useEffect, useCallback } from "react";
import type { AIProvider } from "@/lib/types";

interface ServerConfigured {
  yt: boolean;
  ai: boolean;
}

interface UseApiKeyReturn {
  apiKey: string | null;
  aiApiKey: string | null;
  aiProvider: AIProvider;
  isLoaded: boolean;
  serverConfigured: ServerConfigured;
  saveApiKey: (key: string) => void;
  clearApiKey: () => void;
  saveAIKey: (key: string, provider: AIProvider) => void;
  clearAIKey: () => void;
}

const LS_YT_KEY = "yt_api_key";
const LS_AI_KEY = "ai_api_key";
const LS_AI_PROVIDER = "ai_provider";

export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<AIProvider>("claude");
  const [isLoaded, setIsLoaded] = useState(false);
  const [serverConfigured, setServerConfigured] = useState<ServerConfigured>({
    yt: false,
    ai: false,
  });

  // Load from localStorage first, then check server for env vars
  useEffect(() => {
    // 1. Load from localStorage (persists across refreshes)
    try {
      const storedYt = localStorage.getItem(LS_YT_KEY);
      const storedAi = localStorage.getItem(LS_AI_KEY);
      const storedProvider = localStorage.getItem(LS_AI_PROVIDER);

      if (storedYt) setApiKey(storedYt);
      if (storedAi) setAiApiKey(storedAi);
      if (storedProvider === "claude" || storedProvider === "openai") {
        setAiProvider(storedProvider);
      }
    } catch {
      // localStorage unavailable (e.g. SSR)
    }

    // 2. Check server for env-var-configured keys (override localStorage)
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.serverConfigured?.yt && data.ytApiKey) {
          setApiKey(data.ytApiKey);
        }
        if (data.serverConfigured?.ai && data.aiApiKey) {
          setAiApiKey(data.aiApiKey);
        }
        if (data.serverConfigured?.ai && data.aiProvider) {
          setAiProvider(data.aiProvider);
        }
        if (data.serverConfigured) {
          setServerConfigured(data.serverConfigured);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const saveApiKey = useCallback((key: string) => {
    setApiKey(key);
    try { localStorage.setItem(LS_YT_KEY, key); } catch {}
  }, []);

  const clearApiKey = useCallback(() => {
    setApiKey(null);
    try { localStorage.removeItem(LS_YT_KEY); } catch {}
  }, []);

  const saveAIKey = useCallback((key: string, provider: AIProvider) => {
    setAiApiKey(key);
    setAiProvider(provider);
    try {
      localStorage.setItem(LS_AI_KEY, key);
      localStorage.setItem(LS_AI_PROVIDER, provider);
    } catch {}
  }, []);

  const clearAIKey = useCallback(() => {
    setAiApiKey(null);
    try {
      localStorage.removeItem(LS_AI_KEY);
      localStorage.removeItem(LS_AI_PROVIDER);
    } catch {}
  }, []);

  return {
    apiKey,
    aiApiKey,
    aiProvider,
    isLoaded,
    serverConfigured,
    saveApiKey,
    clearApiKey,
    saveAIKey,
    clearAIKey,
  };
}
