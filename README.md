# FXRP Remittance Jar

**UPI → native XRP in under 2 minutes, on Flare FAssets.**

Built for [Flare Summer Signal](https://dorahacks.io/hackathon/flaresummersignal/detail) — Track 1: Interoperable Asset Products.

> India's UPI is the cheapest way to onboard INR. Flare's FAssets (FXRP) let you put a smart-contract wrapper around XRP — which has none. Combined, you get a remittance rail with a 0.5% fee and a 2-minute settlement, instead of Western Union's 6–7% and 15-minute cash pickup. Send to **any country** where the recipient holds XRP.

---

## Live on-chain proof (Coston2 testnet)

The full flow — XRP deposit → FDC attestation → FXRP mint → FXRP redeem → XRP withdrawal — has been executed and verified on Flare's Coston2 testnet.

| Step | TX Hash | Explorer |
|---|---|---|
| **Mint** (XRPL → FXRP) | `0xfa1254104ba94aa409a3d6e7bcaf905e0d4f07b388b22d87813120d373bedc57` | [View](https://coston2-explorer.flare.network/tx/0xfa1254104ba94aa409a3d6e7bcaf905e0d4f07b388b22d87813120d373bedc57) |
| **Redeem** (FXRP → XRPL) | `0x594a2d27f1926e669b40d065611cc06aa55ad9aff1a6cb341c66b8960f72b095` | [View](https://coston2-explorer.flare.network/tx/0x594a2d27f1926e669b40d065611cc06aa55ad9aff1a6cb341c66b8960f72b095) |

- **XRPL deposit**: 10.2 XRP sent to Core Vault with direct-mint memo
- **FDC attestation**: Attestation type `XRPPayment`, voting round 1425199, status VALID
- **Mint**: `DirectMintingExecuted` event — 10 FXRP minted to executor
- **Redeem**: `redeem(1 lot)` — 10 FXRP redeemed to XRPL recipient
- **Executor**: `0x8070C21dBD21BE7Fe0956681e0Bfb0d8C5544186`
- **AssetManagerFXRP**: `0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA`

Full evidence table in [`docs/HACKATHON_READINESS.md`](docs/HACKATHON_READINESS.md).

---

## Flare resources integrated

| Flare Resource | What it does | Where it's used |
|---|---|---|
| **FTSO v2** (XRP/USD price feed) | Live XRP price for INR→FXRP conversion | `lib/ftso.ts` — reads `FtsoV2` via `FlareContractRegistry`, called by `app/api/quote/route.ts` |
| **FlareContractRegistry** | Resolves all contract addresses at runtime (no hardcoding) | `lib/fxrp.ts` — resolves `AssetManagerFXRP` and FXRP ERC-20 token address |
| **FAssets — FXRP** | Smart-contract wrapped XRP on Flare, the in-flight remittance asset | `lib/fassets.ts` — mint (`reserveCollateral` + `executeMinting`) and `redeem` flows |
| **FDC (Flare Data Connector)** | Verifies XRPL payments on-chain via attestation proofs | `lib/fassets.ts` — reads `FASSET_MINT_PROOF_JSON`/`URL`; `scripts/real-mint.mjs` — full FDC attestation + DA proof fetch |
| **Coston2 testnet** | Flare's test network where all on-chain activity runs | `lib/flare.ts` — chain config, RPC, explorer URLs; all API routes target Coston2 |
| **AssetManagerFXRP contract** | Core contract: collateral reservation, minting, redemption | `app/api/mint/route.ts` — `reserveCollateral` + `executeMinting`; `app/api/redeem/route.ts` — `redeem` |
| **Core Vault** (XRPL side) | Receives XRP deposits and releases XRP on redemption | `scripts/real-mint.mjs` — XRPL payment target; agent vault resolved dynamically at runtime |

---

## Project structure

```
flare-remit/
├── app/
│   ├── layout.tsx              root layout (wagmi + QueryClient providers)
│   ├── page.tsx                landing page
│   ├── providers.tsx           wagmi + @tanstack/react-query setup
│   ├── r/[id]/page.tsx         shareable recipient tracking link
│   ├── app/
│   │   ├── page.tsx            send desk (AppSend component)
│   │   ├── layout.tsx          app-scoped layout
│   │   ├── about/page.tsx      FAssets explainer
│   │   ├── compare/page.tsx    fee comparison (Wise/WU/Remitly)
│   │   └── track/page.tsx      transfer list
│   └── api/
│       ├── quote/              FTSO-powered INR→FXRP quote
│       ├── upi/create/         UPI intent/deeplink generation
│       ├── upi/webhook/        payment received handler
│       ├── upi/confirm/        manual UPI UTR verification
│       ├── mint/               FAsset mint (reserveCollateral + executeMinting)
│       ├── redeem/             FAsset redemption
│       └── transfer/[id]/      public transfer status endpoint
├── components/
│   ├── AppSend.tsx             main transfer card with country selector
│   ├── StatusTracker.tsx       live transfer state tracker
│   ├── ProgressSteps.tsx       step progress indicator
│   ├── HeroStats.tsx           landing page stats
│   ├── AppNav.tsx              app sidebar navigation
│   └── LandingNav.tsx          landing page nav
├── lib/
│   ├── flare.ts                Coston2 chain config + FlareContractRegistry address
│   ├── fxrp.ts                 on-chain address resolver (AssetManager + FXRP token)
│   ├── fassets.ts              mint (reserveCollateral → executeMinting) + redeem
│   ├── ftso.ts                 FTSO v2 price feed (XRP/USD)
│   ├── countries.ts            destination country registry (15 countries)
│   ├── psp.ts                  PSP abstraction (Razorpay / Cashfree / Paddle / demo)
│   ├── paddle.ts               Paddle billing integration
│   ├── mockUpi.ts              UPI order store (demo)
│   ├── persistentStore.ts      server-side transfer persistence
│   ├── format.ts               display formatters (INR, USD, time)
│   └── store.ts                client-side transfer state (zustand)
├── scripts/
│   ├── real-mint.mjs           full FDC attestation + direct minting flow
│   ├── redeem.mjs              on-chain FXRP redeem to XRPL
│   └── diag-*.mjs              diagnostic scripts for Coston2
└── docs/
    └── HACKATHON_READINESS.md  on-chain evidence table
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SENDER (India)                                     │
│                                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │ UPI App  │───▶│  /api/upi/   │───▶│  Webhook confirms payment        │   │
│  │ (GPay,   │    │  create      │    │  → POST /api/upi/webhook         │   │
│  │ PhonePe) │    │  + confirm   │    │  → runFAssetRemittance()         │   │
│  └──────────┘    └──────────────┘    └──────────────┬───────────────────┘   │
│                                                      │                      │
│  ┌───────────────────────────────────────────────────▼──────────────────┐   │
│  │                     Next.js App (Vercel)                            │   │
│  │                                                                     │   │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │   │
│  │  │ FTSO v2 │  │ Quote    │  │ PSP        │  │ Transfer Store   │   │   │
│  │  │ XRP/USD │  │ Engine   │  │ Abstraction│  │ (zustand + JSON) │   │   │
│  │  └────┬────┘  └──────────┘  └────────────┘  └──────────────────┘   │   │
│  │       │ live price                                                   │   │
│  └───────┼──────────────────────────────────────────────────────────────┘   │
│          │                                                                  │
└──────────┼──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLARE (Coston2 Testnet)                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  FlareContractRegistry                                              │   │
│  │  Resolves: AssetManagerFXRP, FXRP Token, FtsoV2                     │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────▼───────────────────────────────────────┐   │
│  │                AssetManagerFXRP Contract                             │   │
│  │                                                                      │   │
│  │  1. reserveCollateral(agentVault, lots)  ← collateral reservation    │   │
│  │  2. executeMinting(proof, reservationId) ← FDC-backed mint           │   │
│  │  3. redeem(lots, xrplAddress)            ← return to XRPL            │   │
│  └──────────┬──────────────────────────┬────────────────────────────────┘   │
│             │                          │                                    │
│  ┌──────────▼──────────┐  ┌────────────▼─────────────────────────────┐     │
│  │  FXRP ERC-20 Token  │  │  FDC (Flare Data Connector)             │     │
│  │  In-flight asset    │  │  Attests XRPL payments via proofs       │     │
│  │  6 decimals, lots   │  │  Type: XRPPayment                       │     │
│  └─────────────────────┘  └─────────────────────────────────────────┘     │
│                                                                             │
└──────────┬──────────────────────────┬──────────────────────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    XRPL (XRP Ledger)                                        │
│                                                                             │
│  ┌─────────────────────┐         ┌──────────────────────────────────────┐   │
│  │  Core Vault         │         │  Recipient Wallet                    │   │
│  │  rDhpmiPq4BV...     │────────▶│  rK7Ex4n9LYH...                      │   │
│  │  Receives XRP       │  XRP    │  Receives native XRP                 │   │
│  │  deposits           │  release│  from FXRP redemption                │   │
│  └─────────────────────┘         └──────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data flow summary:**

1. Sender enters amount → FTSO v2 provides live XRP/USD price → quote engine converts INR → FXRP
2. Sender pays via UPI → PSP webhook (or demo confirmation) triggers the pipeline
3. **Flare side**: `reserveCollateral` locks agent vault → FDC attests the XRPL deposit → `executeMinting` mints FXRP → `redeem` burns FXRP
4. **XRPL side**: Agent releases native XRP to recipient's wallet
5. Total settlement: ≈ 2 minutes, 0.5% fee (vs Western Union 6–7%, 15 min)

## How the Flare integration works

1. **Price feed** — `/api/quote` reads the FTSO `XRP/USD` feed (`getFeedById` against `FtsoV2` resolved from `FlareContractRegistry`). If the FTSO read fails on testnet, it falls back to a sensible static price so the demo never stalls.
2. **Address resolution** — `lib/fxrp.ts` resolves the `AssetManagerFXRP` and the FXRP ERC-20 address via `FlareContractRegistry.getContractAddressByName`. The registry address is a known Flare constant; all other addresses are resolved dynamically.
3. **Mint + transfer** — `POST /api/mint` calls `reserveCollateral` + `executeMinting` on the AssetManager via ethers v6. Requires `EXECUTOR_PK` in `.env.local` (a Coston2 EOA with FLR for collateral). Without it, the pipeline throws an error with setup instructions.
4. **Redemption** — `POST /api/redeem` calls `redeem` on the AssetManager to return FXRP to native XRP on XRPL. The redemption ticket is created on-chain and the agent releases XRP to the recipient's XRPL address.

## Payment providers

The app supports multiple PSPs via `lib/psp.ts`:

| Provider | How to enable |
|---|---|
| **Demo** | Default. Set `UPI_DEMO_MODE=true` (enabled by default). |
| **Razorpay** | Set `UPI_PSP=razorpay` + `RAZORPAY_KEY_ID` + `RAZORPAY_WEBHOOK_SECRET` |
| **Cashfree** | Set `UPI_PSP=cashfree` + `CASHFREE_APP_ID` + `CASHFREE_WEBHOOK_SECRET` |
| **Paddle** | Set `UPI_PSP=paddle` + `PADDLE_CLIENT_TOKEN` + `PADDLE_API_KEY` + `PADDLE_WEBHOOK_SECRET` |

## Running it

```bash
cp .env.local.example .env.local
# Required: EXECUTOR_PK (Coston2 EOA with FLR + FXRP)
# Optional: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (if using WalletConnect)
npm install
npm run dev
```

Open <http://localhost:3000>.

To exercise the live onchain path:
1. Get Coston2 C2FLR + testnet FXRP from the [Coston2 faucet](https://faucet.flare.network/coston2).
2. Put the funded private key in `EXECUTOR_PK`.
3. Restart `npm run dev`. The mint + transfer txs will now hit Coston2 for real.

## The 2-minute demo script

1. "Sending ₹5,000 abroad."
2. Pick a destination country (Philippines, US, UAE, etc.).
3. Enter recipient name + XRPL address.
4. Click *Continue to UPI →*. The UPI intent screen pops up.
5. Click *I paid — confirm & continue* (demo confirmation; production uses signed PSP webhooks).
6. Status moves `UPI received → Minting FXRP → Transferred`.
7. Show `/app/compare` — recipient gets more XRP vs Western Union for the same ₹5,000.
8. Done.

## Why this wins Track 1

- **The Flare integration isn't decoration** — FXRP is the entire payment vehicle. Without it, the product doesn't exist.
- **A judge can verify the integration** — every tx hash links to the Coston2 explorer.
- **It's a real product** — not a wrapped-DeFi clone. India's cross-border remittance is a $100B+/year market, mostly on rails that charge 5–7%.
- **It ships in one sitting** — the demo is one flow, three screens, one env var.
- **It composes with the rest of the stack** — the recipient's wallet can plug in FTSO-priced FX hedges, FDC-attested KYC, or a Smart Accounts recovery flow without touching the sender side.
