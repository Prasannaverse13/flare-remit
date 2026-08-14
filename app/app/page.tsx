import { AppSend } from '@/components/AppSend';
import { AppNav } from '@/components/AppNav';
import Link from 'next/link';
import { DisconnectWalletButton } from '@/components/DisconnectWalletButton';

export default function AppHome() {
  return (
    <div className="spatial-home">
      <div className="spatial-tabs" aria-label="Workspace sections">
        <Link href="/app" className="spatial-tab active">Remit desk</Link><Link href="/app/track" className="spatial-tab">Transfers</Link><Link href="/app/about" className="spatial-tab">FAssets</Link><Link href="/app/compare" className="spatial-tab">Insights</Link><Link href="/app/about" className="spatial-add" aria-label="Open project information">+</Link><DisconnectWalletButton />
      </div>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
      <AppNav />
      <div>
        <div className="spatial-greeting"><div><p className="eyebrow">COSTON2 · LIVE DESK</p><p className="spatial-welcome">Good morning, operator</p></div><div className="spatial-status"><span /> Wallet session ready</div></div>
        <div className="spatial-overview"><div className="spatial-mini"><span className="eyebrow">Corridor</span><strong>Global</strong><small>UPI → XRP</small></div><div className="spatial-mini"><span className="eyebrow">Typical settle</span><strong>02:00</strong><small>minutes</small></div><div className="spatial-mini"><span className="eyebrow">Network</span><strong>FLR</strong><small>FAssets enabled</small></div></div>
        <header>
          <p className="eyebrow">Send</p>
          <h1
            className="mt-4 text-chalk"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 300, letterSpacing: '-0.037em', lineHeight: 1 }}
          >
            UPI to native XRP<br />in 120 seconds.
          </h1>
          <p className="mt-5 max-w-[48ch] text-body text-bone">
            The transfer panel below is the product. Everything else on this page
            is metadata — the corridor, the FXRP you receive, the onchain trail.
          </p>
        </header>

        <AppSend />

        <p className="mono-label mt-10">
          Coston2 testnet · FXRP minted via FAsset bridge · redeemed on XRPL
        </p>
      </div>
      </div>
    </div>
  );
}
