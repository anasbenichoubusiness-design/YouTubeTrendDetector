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

export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<AIProvider>("claude");
  const [isLoaded, setIsLoaded] = useState(false);
  const [serverConfigured, setServerConfigured] = useState<ServerConfigured>({ yt: false, ai: false });

  // Load from server on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.ytApiKey) setApiKey(data.ytApiKey);
        if (data.aiApiKey) setAiApiKey(data.aiApiKey);
        if (data.aiProvider === "claude" || data.aiProvider === "openai") {
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
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ytApiKey: key }),
    }).catch(() => {});
  }, []);

  const clearApiKey = useCallback(() => {
    setApiKey(null);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ytApiKey: "" }),
    }).catch(() => {});
  }, []);

  const saveAIKey = useCallback((key: string, provider: AIProvider) => {
    setAiApiKey(key);
    setAiProvider(provider);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiApiKey: key, aiProvider: provider }),
    }).catch(() => {});
  }, []);

  const clearAIKey = useCallback(() => {
    setAiApiKey(null);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiApiKey: "", aiProvider: "" }),
    }).catch(() => {});
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
