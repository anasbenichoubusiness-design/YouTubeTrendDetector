"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "yt-api-key";

interface UseApiKeyReturn {
  apiKey: string | null;
  isLoaded: boolean;
  saveApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setApiKey(stored);
      }
    } catch {
      // localStorage unavailable (SSR or privacy mode)
    }
    setIsLoaded(true);
  }, []);

  const saveApiKey = useCallback((key: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, key);
      setApiKey(key);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const clearApiKey = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setApiKey(null);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { apiKey, isLoaded, saveApiKey, clearApiKey };
}
