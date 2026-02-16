"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

const STEPS = [
  "Searching YouTube...",
  "Fetching video details...",
  "Fetching channel stats...",
  "Scoring outliers...",
  "Generating video ideas...",
];

const STEP_DURATIONS = [2000, 3500, 3000, 2500, 4000];

interface AnalysisProgressProps {
  isLoading: boolean;
}

export function AnalysisProgress({ isLoading }: AnalysisProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0);
      return;
    }

    let step = 0;
    setCurrentStep(0);

    function scheduleNext() {
      if (step >= STEPS.length - 1) return;
      const timeout = setTimeout(() => {
        step++;
        setCurrentStep(step);
        scheduleNext();
      }, STEP_DURATIONS[step]);

      return timeout;
    }

    const timeout = scheduleNext();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="mx-auto max-w-md space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
      <p className="text-center text-sm font-medium text-zinc-300 mb-4">
        Analyzing your niche...
      </p>
      {STEPS.map((label, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        const isPending = i > currentStep;

        return (
          <div key={label} className="flex items-center gap-3">
            <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
              {isComplete && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              )}
              {isCurrent && (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
                </span>
              )}
              {isPending && (
                <span className="inline-flex h-2 w-2 rounded-full bg-zinc-700" />
              )}
            </div>
            <span
              className={
                isComplete
                  ? "text-sm text-emerald-400"
                  : isCurrent
                    ? "text-sm font-medium text-zinc-200"
                    : "text-sm text-zinc-600"
              }
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
