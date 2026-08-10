import Link from 'next/link';
import { LandingConnect } from '@/components/LandingConnect';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen text-bone">
      <LandingNav />

      {/* HERO — full-bleed photograph, single big headline */}
      <section className="relative">
        <div className="relative h-[92vh] min-h-[680px] w-full overflow-hidden">
          <img
            src="/hero/hero.jpg"
            alt="Mountains at golden hour, a horizon between India and the rest of the world"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)',
            }}
          />
          <div className="absolute inset-0 mx-auto flex w-full max-w-page flex-col items-center justify-center px-6 pt-12 text-center">
            <p className="eyebrow mb-5 font-mono text-bone/80">FLARE SUMMER SIGNAL · TRACK 1</p>
            <h1
              className="mx-auto text-chalk"
              style={{
                fontSize: 'clamp(48px, 8vw, 96px)',
                fontWeight: 300,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
              }}
            >
              <span className="block">Cross-border.</span>
              <span className="block">Two minutes.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[44ch] text-center text-body text-bone">
              UPI in. Native XRP out. The bridge is FAssets on Flare — trustless, over-collateralized, settled in 120 seconds.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-16 w-full max-w-page px-6 pb-28">
        <div className="card mx-auto flex max-w-[720px] flex-col items-center gap-5 p-8 text-center">
          <p className="eyebrow font-mono">Connect a Coston2 wallet to start</p>
          <p className="max-w-[44ch] text-body text-bone">
            Live FAsset minting needs a Coston2 wallet. You can still browse the flow without one — the recipient link handles the rest.
          </p>
          <div className="flex items-center gap-3">
            <LandingConnect />
            <Link href="/app" className="btn-ghost-pill">Browse the app →</Link>
          </div>
        </div>
      </section>

      {/* STAT ROW */}
      <section className="mx-auto w-full max-w-page px-6 pb-24">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-12">
          <Stat accent="tintGreen" value="0.5%" label="Effective fee on a ₹5,000 transfer" />
          <Stat accent="tintBlue" value="2 min" label="Settlement time, UPI intent to XRPL confirmation" />
          <Stat accent="tintOrange" value="6.0%" label="What the same transfer costs on Western Union" />
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

function Stat({ accent, value, label }: { accent: string; value: string; label: string }) {
  const bg = {
    tintGreen: 'bg-tintGreen',
    tintBlue: 'bg-tintBlue',
    tintOrange: 'bg-tintOrange',
  }[accent] || 'bg-bone';
  return (
    <div className="flex items-stretch gap-5">
      <div className={`stat-bar ${bg}`} aria-hidden />
      <div className="text-left">
        <div
          className="text-bone"
          style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1 }}
        >
          {value}
        </div>
        <p className="mt-2 max-w-[260px] text-body text-bone">{label}</p>
      </div>
    </div>
  );
}
