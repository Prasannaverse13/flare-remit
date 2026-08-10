'use client';

/**
 * Vertical icon dock on the left side of /app pages.
 * Apple Home style: floating glass column with icon-only nav.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppConnectPill } from './AppConnectPill';

const NAV = [
  { href: '/app', label: 'Send', icon: <IconSend /> },
  { href: '/app/compare', label: 'Compare', icon: <IconCompare /> },
  { href: '/app/track', label: 'Track', icon: <IconTrack /> },
  { href: '/app/about', label: 'How', icon: <IconInfo /> },
];

export function SideDock() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <aside className="fixed left-4 top-1/2 z-20 -translate-y-1/2 hidden md:block">
      <div className="dock">
        <Link
          href="/app"
          className="dock-icon"
          aria-label="FXRP Remit"
          title="FXRP Remit"
        >
          <LogoMark />
        </Link>
        <div className="my-1 h-px w-6 bg-bone/8" />
        {NAV.map((item) => {
          const active = mounted && pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="dock-icon"
              data-active={active ? 'true' : 'false'}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
            </Link>
          );
        })}
        <div className="my-1 h-px w-6 bg-bone/8" />
        <div className="dock-icon" title="Session">
          <AppConnectPill />
        </div>
      </div>
    </aside>
  );
}

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 14C7 6 17 6 21 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="14" r="2" fill="currentColor" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9z" />
    </svg>
  );
}

function IconCompare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconTrack() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v5h1" />
    </svg>
  );
}
