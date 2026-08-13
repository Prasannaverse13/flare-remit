# MINT_SETUP.md — wiring a real FAsset executor on Coston2

The `/api/mint` and `/api/upi/webhook` endpoints call
`runFAssetRemittance` in `lib/fassets.ts`, which executes the real
FAsset lifecycle on Coston2:

```
reserveCollateral()  ← executor locks FLR against the lot
       ↓
executeMinting(proof, reservationId)
       ↓
getMintingProof (FDC attestation of the underlying XRP payment)
       ↓
redeem(lots, xrplAddress, executor)  ← releases native XRP on XRPL
```

For the demo to actually settle (rather than fall through to the
"awaiting_executor" branch) you need to configure three env vars on
Vercel. This document walks through the exact steps.

## 1. Provision a Coston2 executor wallet

```bash
# Generate a fresh EOA — never reuse a wallet that holds mainnet funds.
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"

# → 0x...  (save as EXECUTOR_PK in Vercel)
```

Get testnet FLR from the [Coston2 faucet](https://faucet.flare.network/coston2)
(0.5 C2FLR is enough for a few hundred test mints).

You also need a small FXRP balance to pay the minting fee. The
simplest path is to **self-mint** through any registered agent:

```bash
# Call AssetManagerFXRP.selfMint(1, maxFeeBips) on Coston2
# using a tool like cast or a small script.
```

You can also ask the team chat for testnet FXRP — most agents have
oversupply during the hackathon.

## 2. Set the env vars on Vercel

```bash
# from the project root
vercel env add EXECUTOR_PK production        # paste the 0x... private key
vercel env add FASSET_MAX_MINTING_FEE_BIPS production   # 500 = 5%
vercel env add FASSET_FXRP_FEE_ALLOWANCE production     # 100000000 = 100 FXRP
vercel env add FASSET_AGENT_VAULT production           # optional override
vercel env add FASSET_MINT_PROOF_URL production         # see step 3
```

Trigger a redeploy:

```bash
vercel --prod
```

## 3. Wire an FDC mint-proof worker

`FASSET_MINT_PROOF_URL` must point at a worker that returns the FDC
attestation proof JSON for the underlying XRP payment. The shape
matches `MintProof` in `lib/fassets.ts`:

```jsonc
{
  "attestationType": "0x5041594d454e5400000000000000000000000000000000000000000000000000",
  "sourceId":        "0x5852500000000000000000000000000000000000000000000000000000000000",
  "votingRound":     12345,
  "lowestUsedTimestamp": 1700000000,
  "requestBody":  { "transactionId": "0x...", "inUtxo": 0, "utxo": 0 },
  "responseBody": {
    "blockNumber": 12345678,
    "blockTimestamp": 1700000000,
    "sourceAddressHash": "0x...",
    "sourceAddressesRoot": "0x...",
    "receivingAddressHash": "0x...",
    "intendedReceivingAddressHash": "0x...",
    "spentAmount": "10000000",
    "intendedSpentAmount": "10000000",
    "receivedAmount": "10000000",
    "intendedReceivedAmount": "10000000",
    "standardPaymentReference": "0x...",
    "oneToOne": true,
    "status": 0
  }
}
```

A minimal worker is ~50 lines: poll XRPL for the underlying payment
matching `requestBody.transactionId`, then call the FDC Hub's
`requestAttestation` with the Payment type, wait for the
`attestationRequest` event, then poll `FdcVerification.isVerified`
until the proof is available. See the [FDC quickstart](https://dev.flare.network/fdc/overview)
for the exact ABI calls.

For a hackathon demo, a simpler option is to **stitch a recorded proof
once** and serve it from a static URL (`FASSET_MINT_PROOF_JSON` env var
instead of `_URL`).

## 4. Verify end-to-end

```bash
# Confirm the env vars reached production
vercel env ls production

# Trigger a test transfer from the UI
#   https://<your-deploy>.vercel.app/app
#   enter 1000 INR → Pay with UPI → Simulate payment success

# Open the recipient link in an incognito window
#   https://<your-deploy>.vercel.app/r/<transferId>
# You should see stages advance UPI → Reserved → FDC proof → FXRP → Redeemed.
```

The two Coston2 transactions (mint + redeem) are visible on the
recipient page as live Coston2-explorer links.

## Why the demo currently stops at "awaiting_executor"

The shipped demo runs on Vercel's free tier without `EXECUTOR_PK` or
`FASSET_MINT_PROOF_URL` set — by design, since real testnet FLR
provisioning and an FDC worker are operator-side setup. When those
env vars are absent, `/api/upi/webhook` advances the transfer to
`payment_received` and surfaces a clear "Settlement paused" banner
with the missing-config checklist. The recipient link still renders
the state, so the demo flow is observable end-to-end without
requiring a funded executor.
