import { AppNav } from '@/components/AppNav';

const STEPS = [
  { n: '01', t: 'Pay with UPI', d: 'Sender pays in INR through any UPI app. Funds settle into the onramp account in seconds.' },
  { n: '02', t: 'Mint FXRP on Flare', d: 'FXRP is the FAsset that wraps native XRP. The onramp mints it via the FXRP AssetManager, collateralized on Flare.' },
  { n: '03', t: 'Transfer', d: 'FXRP hops to the recipient\'s wallet on Flare. The transaction is a standard ERC-20 transfer with a fee under a cent.' },
  { n: '04', t: 'Redeem to native XRP', d: 'Recipient redeems FXRP through the AssetManager. The agent releases the underlying XRP on the XRPL.' },
  { n: '05', t: 'Confirmed on the XRPL', d: 'The recipient\'s XRPL wallet sees the native XRP. Total elapsed time: about two minutes.' },
];

export default function AboutPage() {
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
      <AppNav />
      <div className="space-y-10">
        <header>
          <p className="eyebrow">How it works</p>
          <h1
            className="mt-4 text-chalk"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 300, letterSpacing: '-0.037em', lineHeight: 1 }}
          >
            The bridge in five steps.
          </h1>
        </header>

        <ol className="space-y-px overflow-hidden rounded-cards border border-bone/10 bg-bone/10">
          {STEPS.map((s) => (
            <li key={s.n} className="grid grid-cols-[80px_1fr] gap-6 bg-obsidian p-6">
              <div>
                <p className="font-mono text-[28px] font-light text-bone" style={{ letterSpacing: '-0.02em' }}>
                  {s.n}
                </p>
              </div>
              <div>
                <p className="text-subhead font-light text-chalk" style={{ letterSpacing: '-0.02em' }}>
                  {s.t}
                </p>
                <p className="mt-2 max-w-[60ch] text-caption text-ash">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="card">
          <p className="eyebrow">Why FAssets</p>
          <p className="mt-3 text-body text-bone max-w-[60ch]">
            XRP has no smart contracts — you can't program a remittance flow on it directly.
            FAssets turns XRP into an ERC-20 on Flare (FXRP), so the entire DeFi toolbox works on
            it. Once the transfer is complete, FXRP can be redeemed for native XRP on the XRPL.
            That wrapping is the whole product.
          </p>
        </div>
      </div>
    </div>
  );
}
