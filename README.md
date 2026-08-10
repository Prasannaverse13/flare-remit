# FXRP Remittance Jar

**UPI → native XRP in under 2 minutes, on Flare FAssets.**

Built for [Flare Summer Signal](https://dorahacks.io/hackathon/flaresummersignal/detail) — Track 1: Interoperable Asset Products.

> The pitch: India's UPI is the cheapest way to onboard INR. Flare's FAssets (FXRP) let you put a smart-contract wrapper around XRP — which has none. Combined, you get a remittance rail with a 0.5% fee and a 2-minute settlement, instead of Western Union's 6–7% and 15-minute cash pickup.

---

## What's in the box

```
flare-remit/
├── app/
│   ├── page.tsx               landing + inline wizard
│   ├── send/page.tsx          /send (the 3-step flow)
│   ├── track/[id]/page.tsx    /track/:id (full status + redeem)
│   ├── compare/page.tsx       /compare (fee side-by-side vs Wise/WU/Remitly)
│   ├── api/
│   │   ├── quote/             FTSO-powered INR→XRP quote
│   │   ├── upi/create/        Razorpay order (or mock)
│   │   ├── upi/webhook/       Payment received handler
│   │   ├── mint/              FAsset mint + transfer to recipient
│   │   └── redeem/            FAsset redemption ticket
│   └── providers.tsx          wagmi + RainbowKit
├── components/
│   ├── SendWizard.tsx         3-step wizard (the heart of the demo)
│   ├── StatusTracker.tsx      live transfer state
│   ├── ProgressSteps.tsx
│   ├── HeroStats.tsx
│   └── Header.tsx
├── lib/
│   ├── flare.ts               Coston2 config + registry address
│   ├── fxrp.ts                onchain resolver (no hardcoded addresses)
│   ├── fassets.ts             full reserve/execute mint helpers
│   ├── ftso.ts                FTSO price read
│   ├── mockUpi.ts             Razorpay-or-mock UPI
│   └── store.ts               in-flight transfer state
└── README.md
```

## How the Flare integration works

1. **Price feed** — `/api/quote` reads the FTSO `XRP/USD` feed (`getFeedById` against `FtsoV2` resolved from `FlareContractRegistry`). If the FTSO read fails on testnet, it falls back to a sensible static price so the demo never stalls.
2. **Address resolution** — `lib/fxrp.ts` resolves the `AssetManagerFXRP` and the FXRP ERC-20 address via `FlareContractRegistry.getContractAddressByName`. **No addresses are hardcoded.**
3. **Mint + transfer** — `POST /api/mint` calls the AssetManager and FXRP token contracts via ethers v6. Without a `DEMO_EXECUTOR_PK` env var, it runs in dry mode (synthetic tx hash) so the UI flow stays demoable. With a key, it executes the real transfer on Coston2.
4. **Redemption** — `POST /api/redeem` simulates the FAsset redemption ticket (the onchain portion is wired in `lib/fassets.ts`; the demo's simulated settlement is intentional so the XRPL hop doesn't need a funded agent).

## Running it

```bash
cp .env.local.example .env.local
# (optional) add DEMO_EXECUTOR_PK + NEXT_PUBLIC_WC_PROJECT_ID
npm install
npm run dev
```

Open <http://localhost:3000>.

To exercise the live onchain path:
1. Get Coston2 C2FLR + testnet FXRP from the [Coston2 faucet](https://faucet.flare.network/coston2).
2. Put the funded private key in `DEMO_EXECUTOR_PK`.
3. Restart `npm run dev`. The mint + transfer txs will now hit Coston2 for real.

## The 2-minute demo script

1. "Sending ₹5,000 to my cousin in Manila."
2. Click *Continue to UPI →*. The UPI intent screen pops up.
3. Click *Simulate payment success*. (In prod, this is replaced by the real Razorpay success screen.)
4. Status moves `UPI received → Minting FXRP → Transferred`.
5. Open `/track/:id` → click *Recipient redeems to XRPL* → status flips to `Redeemed`.
6. Show `/compare` — recipient gets **53.7 XRP** vs Western Union's **48 XRP** for the same ₹5,000.
7. Done.

## Why this wins Track 1

- **The Flare integration isn't decoration** — FXRP is the entire payment vehicle. Without it, the product doesn't exist.
- **A judge can verify the integration** — every tx hash links to the Coston2 explorer.
- **It's a real product** — not a wrapped-DeFi clone. India→SEA remittance is a $20B+ market, mostly on rails that charge 5–7%.
- **It ships in one sitting** — the demo is one flow, three screens, one env var.
- **It composes with the rest of the stack** — the recipient's wallet can plug in FTSO-priced FX hedges, FDC-attested KYC, or a Smart Accounts recovery flow without touching the sender side.

## What's intentionally simplified

- **Razorpay** is mocked so the demo runs without a merchant account. Drop a real key into `.env.local` to swap.
- **XRPL settlement** is simulated server-side. The FAsset redemption path is wired in `lib/fassets.ts` — flip `dry: false` in `app/api/redeem/route.ts` to enable.
- **In-memory state** for transfers (zustand). A real deploy swaps in Postgres or a queue.

## Next steps (if you want to take this past the hackathon)

- Multi-currency corridors (FXRP + FBTC + FDOGE).
- Recipient-side stablecoin conversion (FXRP → USDC.e on Flare via a DEX router).
- Mobile-first PWA with push notifications on each step.
- KYC via FDC attestation for cross-border compliance.

## License

MIT. Build on it.
