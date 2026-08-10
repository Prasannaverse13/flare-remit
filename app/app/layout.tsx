'use client';

/**
 * /app layout — wraps everything in a `.henry-scope` that overrides
 * the Apple tokens back to the Henry darkroom palette. The landing
 * page (in app/) inherits the Apple tokens, the /app/* pages get
 * the Henry look — same code, two scopes.
 */

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="henry-scope min-h-screen text-bone">
      <div className="mx-auto w-full max-w-page px-6 py-10">{children}</div>
    </div>
  );
}
