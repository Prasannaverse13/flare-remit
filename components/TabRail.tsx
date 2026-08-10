'use client';

/**
 * Top-center tab switcher — the Apple "Home" pattern of three
 * pills. Use across all the /app pages for consistent navigation.
 */

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Tab {
  label: string;
  href: string;
}

interface TabRailProps {
  tabs: Tab[];
  rightSlot?: React.ReactNode;
}

export function TabRail({ tabs, rightSlot }: TabRailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="tab-rail">
        {tabs.map((t) => {
          const active = mounted && pathname === t.href;
          return (
            <button
              key={t.href}
              type="button"
              className="pill-tab"
              data-active={active ? 'true' : 'false'}
              onClick={() => router.push(t.href)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {rightSlot}
    </div>
  );
}
