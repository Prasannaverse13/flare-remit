'use client';

/**
 * Henry-style side rail — wordmark, vertical nav, session pill.
 * Lives on the left of /app pages.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppConnectPill } from './AppConnectPill';

const NAV = [
  { href: '/app', label: 'Send' },
  { href: '/app/compare', label: 'Compare' },
  { href: '/app/track', label: 'Track' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside>
      <Link href="/app" className="flex items-center gap-2 text-chalk">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 14C7 6 17 6 21 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="14" r="2" fill="currentColor" />
        </svg>
        <span className="text-[15px] font-medium" style={{ letterSpacing: '-0.02em' }}>
          fxrp remit
        </span>
      </Link>

      <nav className="mt-12 flex flex-col gap-3 text-body-sm text-ash">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'text-chalk' : 'hover:text-bone'}
              style={{ letterSpacing: '-0.02em' }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-12">
        <p className="eyebrow mb-3">Session</p>
        <AppConnectPill />
      </div>

      <p className="mt-12 text-[10px] text-smoke font-mono uppercase tracking-wider">
        Coston2 · v0.1
      </p>
    </aside>
  );
}
