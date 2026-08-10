'use client';

/**
 * Radial dial — Apple "Home" temperature dial. The center of the
 * remittance page. Shows the recipient amount in a sweep arc.
 *
 * Math: the arc spans 270° starting at the bottom-left (135° from
 * north), leaving a 90° gap at the top. We compute stroke-dashoffset
 * from a 0..1 progress and animate with a spring-eased cubic-bezier.
 */

import { useEffect, useState } from 'react';

interface RadialDialProps {
  /** Primary value rendered large in the center */
  value: string;
  /** Small unit label below the value */
  unit: string;
  /** Secondary value above the value */
  meta?: string;
  /** 0..1 progress for the sweep arc */
  progress: number;
  /** Optional second value rendered small at the bottom of the dial */
  footer?: string;
}

const SIZE = 320;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SWEEP = 0.75; // 270° of the full circle

export function RadialDial({ value, unit, meta, progress, footer }: RadialDialProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(progress));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  const offset = CIRCUMFERENCE * (1 - SWEEP) + CIRCUMFERENCE * SWEEP * (1 - animated);

  return (
    <div
      className="relative grid place-items-center select-none"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0"
      >
        <defs>
          <radialGradient id="dial-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff3b30" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ff3b30" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft red glow behind the dial */}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS + 20} fill="url(#dial-glow)" />

        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          className="dial-track"
          strokeDasharray={`${CIRCUMFERENCE * SWEEP} ${CIRCUMFERENCE}`}
          transform={`rotate(135 ${SIZE / 2} ${SIZE / 2})`}
        />

        {/* Progress */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          className="dial-progress"
          strokeDasharray={`${CIRCUMFERENCE * SWEEP} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          transform={`rotate(135 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>

      <div className="relative flex flex-col items-center text-center">
        {meta && <span className="eyebrow mb-2">{meta}</span>}
        <div className="flex items-baseline gap-1">
          <span
            className="text-bone"
            style={{
              fontSize: 56,
              fontWeight: 300,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {value}
          </span>
        </div>
        <span className="mt-2 text-body text-ash">{unit}</span>
        {footer && <span className="mt-3 text-caption text-smoke mono">{footer}</span>}
      </div>
    </div>
  );
}
