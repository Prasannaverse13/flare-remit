# FXRP Remittance Jar

**UPI → native XRP in under 2 minutes, on Flare FAssets.**

Built for [Flare Summer Signal](https://dorahacks.io/hackathon/flaresummersignal/detail) — Track 1: Interoperable Asset Products.

> The pitch: India's UPI is the cheapest way to onboard INR. Flare's FAssets (FXRP) let you put a smart-contract wrapper around XRP — which has none. Combined, you get a remittance rail with a 0.5% fee and a 2-minute settlement, instead of Western Union's 6–7% and 15-minute cash pickup. Send to **any country** where the recipient holds XRP.

---

## Live on-chain proof (Coston2 testnet)

The full flow — XRP deposit → FDC attestation → FXRP mint → FXRP redeem → XRP withdrawal — has been executed and verified on Flare's Coston2 testnet.

| Step | TX Hash | Explorer |
|---|---|---|
| **Mint** (XRPL → FXRP) | `0xfa1254104ba94aa409a3d6e7bcaf905e0d4f07b388b22d87813120d373bedc57` | [View](https://coston2-explorer.flare.network/tx/0xfa1254104ba94aa409a3d6e7bcaf905e0d4f07b388b22d87813120d373bedc57) |
| **Redeem** (FXRP → XRPL) | `0x594a2d27f1926e669b40d065611cc06aa55ad9aff1a6cb341c66b8960f72b095` | [View](https://coston2-explorer.flare.network/tx/0x594a2d27f1926e669b40d065611cc06aa55ad9aff1a6cb341c66b8960f72b095) |

- **XRPL deposit**: 10.2 XRP sent to Core Vault (`rDhpmiPq4BVBDWMVdSrmkgt8thKyRzGV1p`) with direct-mint memo
- **FDC attestation**: Attestation type `XRPPayment`, voting round 1425199, status VALID
- **Mint**: `DirectMintingExecuted` event — 10 FXRP minted to executor
- **Redeem**: `redeemAmount(10,000,000 UBA)` — 1 lot (10 FXRP) redeemed to XRPL recipient
- **Executor**: `0x8070C21dBD21BE7Fe0956681e0Bfb0d8C5544186`
- **AssetManagerFXRP**: `0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA`

Full evidence table in [`docs/HACKATHON_READINESS.md`](docs/HACKATHON_READINESS.md).

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
│   ├── countries.ts           destination country registry
│   ├── mockUpi.ts             Razorpay-or-mock UPI
│   └── store.ts               in-flight transfer state
└── README.md
```

## How the Flare integration works

1. **Price feed** — `/api/quote` reads the FTSO `XRP/USD` feed (`getFeedById` against `FtsoV2` resolved from `FlareContractRegistry`). If the FTSO read fails on testnet, it falls back to a sensible static price so the demo never stalls.
2. **Address resolution** — `lib/fxrp.ts` resolves the `AssetManagerFXRP` and the FXRP ERC-20 address via `FlareContractRegistry.getContractAddressByName`. **No addresses are hardcoded.**
3. **Mint + transfer** — `POST /api/mint` calls the AssetManager and FXRP token contracts via ethers v6. Without a `DEMO_EXECUTOR_PK` env var, it runs in dry mode (synthetic tx hash) so the UI flow stays demoable. With a key, it executes the real direct minting path on Coston2 (XRPL payment → FDC attestation → `executeDirectMinting`).
4. **Redemption** — `POST /api/redeem` calls `redeemAmount` on the AssetManager to return FXRP to native XRP on XRPL. The redemption ticket is created on-chain and the agent releases XRP to the recipient's XRPL address.

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

1. "Sending ₹5,000 abroad."
2. Pick a destination country (Philippines, US, UAE, etc.).
3. Enter recipient name + XRPL address.
4. Click *Continue to UPI →*. The UPI intent screen pops up.
5. Click *Simulate payment success*. (In prod, this is replaced by the real Razorpay success screen.)
6. Status moves `UPI received → Minting FXRP → Transferred`.
7. Show `/compare` — recipient gets **53.7 XRP** vs Western Union's **48 XRP** for the same ₹5,000.
8. Done.

## Why this wins Track 1

- **The Flare integration isn't decoration** — FXRP is the entire payment vehicle. Without it, the product doesn't exist.
- **A judge can verify the integration** — every tx hash links to the Coston2 explorer.
- **It's a real product** — not a wrapped-DeFi clone. India's cross-border remittance is a $100B+/year market, mostly on rails that charge 5–7%.
- **It ships in one sitting** — the demo is one flow, three screens, one env var.
- **It composes with the rest of the stack** — the recipient's wallet can plug in FTSO-priced FX hedges, FDC-attested KYC, or a Smart Accounts recovery flow without touching the sender side.

## What's intentionally simplified

- **Razorpay** is mocked so the demo runs without a merchant account. Drop a real key into `.env.local` to swap.
- **In-memory state** for transfers (zustand). A real deploy swaps in Postgres or a queue.

## Next steps (if you want to take this past the hackathon)

- Multi-currency corridors (FXRP + FBTC + FDOGE).
- Recipient-side stablecoin conversion (FXRP → USDC.e on Flare via a DEX router).
- Mobile-first PWA with push notifications on each step.
- KYC via FDC attestation for cross-border compliance.

## License

MIT. Build on it.
