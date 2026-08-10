/**
 * Display formatting helpers. Kept dead simple so the wizard's number
 * inputs feel like a fintech app, not a CLI.
 */
const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const USD = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function inr(n: number | string): string {
  return '₹' + INR.format(typeof n === 'string' ? Number(n) : n);
}

export function usd(n: number | string): string {
  return '$' + USD.format(typeof n === 'string' ? Number(n) : n);
}

export function shortAddr(addr: string | null | undefined, head = 6, tail = 4) {
  if (!addr) return '—';
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function fmtTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
