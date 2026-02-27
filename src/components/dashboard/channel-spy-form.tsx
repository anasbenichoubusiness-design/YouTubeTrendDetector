"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Loader2 } from "lucide-react";

interface ChannelSpyFormProps {
  onAnalyze: (channelInput: string) => void;
  isLoading: boolean;
}

export function ChannelSpyForm({ onAnalyze, isLoading }: ChannelSpyFormProps) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onAnalyze(input.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Eye className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Enter channel URL or @handle (e.g. @MrBeast)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pl-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
          required
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="min-w-[120px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Spying
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" />
            Spy
          </>
        )}
      </Button>
    </form>
  );
}
