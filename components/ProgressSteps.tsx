'use client';

import { Check } from 'lucide-react';

interface Step {
  key: string;
  label: string;
}

export function ProgressSteps({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={[
                'grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold',
                done
                  ? 'border-flare-accent bg-flare-accent text-white'
                  : active
                  ? 'border-flare-accent text-flare-accent'
                  : 'border-flare-border text-flare-muted',
              ].join(' ')}
            >
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span className={`text-sm ${active ? 'text-flare-text' : 'text-flare-muted'}`}>{s.label}</span>
            {i < steps.length - 1 && (
              <span className="mx-1 h-px w-8 bg-flare-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
