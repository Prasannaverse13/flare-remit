/**
 * Real Coston2 FAsset integration — direct mint + redeem.
 *
 * Flow:
 *  1. Send XRP from XRPL testnet wallet to the FXRP Core Vault with a
 *     DIRECT_MINTING memo encoding the recipient EVM address.
 *  2. Prepare + submit an FDC XRPPayment attestation (voting round).
 *  3. Poll Relay for round finalization, fetch the proof from the DA layer.
 *  4. Call AssetManagerFXRP.executeDirectMinting(proof) -> FXRP minted.
 *  5. Redeem: approve FXRP, call redeem(lots, recipientXrplAddress, executor).
 *
 * Env:
 *  EXECUTOR_PK   Coston2 private key (must hold C2FLR for gas + FDC fee)
 *  XRPL_SEED     XRPL testnet seed (must hold XRP to send to Core Vault)
 */
import { ethers } from 'ethers';
import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';

const RPC = 'https://coston2-api.flare.network/ext/C/rpc';
const REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';
const VERIFIER_BASE = 'https://fdc-verifiers-testnet.flare.network';
const VERIFIER_KEY = '00000000-0000-0000-0000-000000000000';
const DA_LAYER = 'https://ctn2-data-availability.flare.network';
const XRPL_RPC = process.env.XRPL_RPC ?? 'wss://s.altnet.rippletest.net:51233';

const DIRECT_MINT_PREFIX = '4642505266410018'; // "FDPRfA.." per Flare docs
const REGISTRY_ABI = ['function getContractAddressByName(string name) view returns (address)'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EXECUTOR_PK = process.env.EXECUTOR_PK;
const XRPL_SEED = process.env.XRPL_SEED;

function toHex32(str) {
  return '0x' + Buffer.from(str, 'utf8').toString('hex').padEnd(64, '0');
}

async function prepareXrpPaymentRequest(transactionId, proofOwner) {
  const res = await fetch(`${VERIFIER_BASE}/verifier/xrp/XRPPayment/prepareRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': VERIFIER_KEY },
    body: JSON.stringify({
      attestationType: toHex32('XRPPayment'),
      sourceId: toHex32('testXRP'),
      requestBody: { transactionId, proofOwner },
    }),
  });
  const data = await res.json();
  if (!data.abiEncodedRequest) throw new Error('verifier prepare failed: ' + JSON.stringify(data));
  return data.abiEncodedRequest;
}

async function submitAttestation(provider, registry, wallet, abiEncodedRequest) {
  const fdcHub = await registry.getContractAddressByName('FdcHub');
  const hub = new ethers.Contract(fdcHub, coston2.iFdcHubAbi, wallet);
  const feeCfgAddr = await hub.fdcRequestFeeConfigurations();
  const feeCfg = new ethers.Contract(feeCfgAddr, coston2.iFdcRequestFeeConfigurationsAbi, provider);
  const fee = await feeCfg.getRequestFee(abiEncodedRequest);

  const tx = await hub.requestAttestation(abiEncodedRequest, { value: fee });
  const receipt = await tx.wait(1);
  const block = await provider.getBlock(receipt.blockNumber);
  const blockTs = BigInt(block.timestamp);

  const smAddr = await registry.getContractAddressByName('FlareSystemsManager');
  const sm = new ethers.Contract(smAddr, coston2.iFlareSystemsManagerAbi, provider);
  const [startTs, epochSecs] = await Promise.all([
    sm.firstVotingRoundStartTs(),
    sm.votingEpochDurationSeconds(),
  ]);
  const roundId = Number((blockTs - BigInt(startTs)) / BigInt(epochSecs));
  console.log('  FDC attestation submitted. roundId =', roundId, 'tx =', receipt.hash);
  return roundId;
}

async function pollRound(provider, registry, roundId) {
  const fdcVerification = await registry.getContractAddressByName('FdcVerification');
  const relayAddr = await registry.getContractAddressByName('Relay');
  const fdc = new ethers.Contract(fdcVerification, coston2.iFdcVerificationAbi, provider);
  const relay = new ethers.Contract(relayAddr, coston2.iRelayAbi, provider);
  const protocolId = await fdc.fdcProtocolId();
  console.log('  Waiting for FDC round', roundId, 'to finalize (~90-180s)...');
  while (true) {
    const finalized = await relay.isFinalized(BigInt(protocolId), BigInt(roundId));
    if (finalized) break;
    await sleep(15000);
  }
  console.log('  Round', roundId, 'finalized.');
}

async function fetchProof(abiEncodedRequest, roundId) {
  const res = await fetch(`${DA_LAYER}/api/v1/fdc/proof-by-request-round-raw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ votingRoundId: roundId, requestBytes: abiEncodedRequest }),
  });
  const data = await res.json();
  if (data.response_hex === undefined) throw new Error('DA layer: ' + JSON.stringify(data).slice(0, 300));
  return { merkleProof: data.proof ?? [], dataHex: data.response_hex };
}

async function main() {
  if (!EXECUTOR_PK) throw new Error('EXECUTOR_PK not set');
  if (!XRPL_SEED) throw new Error('XRPL_SEED not set');

  const provider = new ethers.JsonRpcProvider(RPC, 114, { staticNetwork: true });
  const wallet = new ethers.Wallet(EXECUTOR_PK, provider);
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider);
  const amAddr = await registry.getContractAddressByName('AssetManagerFXRP');
  const am = new ethers.Contract(amAddr, coston2.iAssetManagerAbi, wallet);
  const fxrpAddr = await am.fAsset();
  const fxrp = new ethers.Contract(fxrpAddr, coston2.ierc20WithMetadataAbi ?? ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)', 'function decimals() view returns (uint8)'], wallet);

  const c2flr = await provider.getBalance(wallet.address);
  console.log('Executor:', wallet.address, 'C2FLR:', ethers.formatEther(c2flr));
  if (c2flr < ethers.parseEther('0.01')) throw new Error('Executor has almost no C2FLR — fund via faucet first');

  // ----- Step 1: send XRP to Core Vault with direct-mint memo -----
  const coreVaultXrpl = await am.directMintingPaymentAddress();
  console.log('Core Vault XRPL:', coreVaultXrpl);

  const netMintXrp = Number(process.env.NET_MINT_XRP ?? '10');
  const executorFeeUBA = (await am.getDirectMintingExecutorFeeUBA()).toString();
  const feeBIPS = (await am.getDirectMintingFeeBIPS()).toString();
  const minFeeUBA = (await am.getDirectMintingMinimumFeeUBA()).toString();
  const netMintUBA = BigInt(xrpToDrops(netMintXrp));
  const propFee = (netMintUBA * BigInt(feeBIPS)) / 10000n;
  const mintFeeUBA = propFee > BigInt(minFeeUBA) ? propFee : BigInt(minFeeUBA);
  const totalUBA = netMintUBA + mintFeeUBA + BigInt(executorFeeUBA);
  const paymentXrp = dropsToXrp(totalUBA.toString());
  console.log('Sending XRP:', paymentXrp, '(net', netMintXrp, '+ mintFee', dropsToXrp(mintFeeUBA.toString()), '+ executorFee', dropsToXrp(executorFeeUBA), ')');

  let txHash;
  const existingHash = process.env.EXISTING_TX_HASH;
  if (existingHash) {
    txHash = existingHash.replace('0x', '');
    console.log('Reusing existing XRPL tx:', txHash);
  } else {
    const memoData = DIRECT_MINT_PREFIX + '00000000' + wallet.address.slice(2).toLowerCase();
    const xrplClient = new Client(XRPL_RPC);
    await xrplClient.connect();
    const xrplWallet = Wallet.fromSeed(XRPL_SEED);
    console.log('XRPL sender:', xrplWallet.classicAddress);

    const prepared = await xrplClient.autofill({
      TransactionType: 'Payment',
      Account: xrplWallet.classicAddress,
      Destination: coreVaultXrpl,
      Amount: String(totalUBA),
      Memos: [{ Memo: { MemoData: memoData } }],
    });
    const signed = xrplWallet.sign(prepared);
    const txResult = await xrplClient.submitAndWait(signed.tx_blob);
    txHash = txResult.result.hash;
    const meta = txResult.result.meta;
    console.log('XRPL payment result:', meta?.TransactionResult, 'hash:', txHash);
    if (meta?.TransactionResult !== 'tesSUCCESS') throw new Error('XRPL payment failed: ' + meta?.TransactionResult);
    await xrplClient.disconnect();
  }

  const transactionId = '0x' + txHash;
  console.log('transactionId:', transactionId);

  // ----- Step 2: FDC attestation -----
  console.log('Waiting for XRPL tx to propagate to FDC indexer...');
  let abiEncoded;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      abiEncoded = await prepareXrpPaymentRequest(transactionId, wallet.address);
      break;
    } catch (e) {
      console.log('  Attempt', attempt + 1, 'failed:', e.message?.slice(0, 80), '— retrying in 15s...');
      await sleep(15000);
    }
  }
  if (!abiEncoded) throw new Error('FDC verifier failed after 10 retries');
  const roundId = await submitAttestation(provider, registry, wallet, abiEncoded);
  await pollRound(provider, registry, roundId);
  const proof = await fetchProof(abiEncoded, roundId);

  // ----- Step 3: executeDirectMinting -----
  const amFull = new ethers.Contract(amAddr, coston2.iDirectMintingAbi, wallet);
  const directMintAbi = coston2.iDirectMintingAbi.find((f) => f.type === 'function' && f.name === 'executeDirectMinting');
  const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
    [{ type: 'tuple', components: directMintAbi.inputs[0].components }],
    proof.dataHex
  )[0];
  const proofStruct = { merkleProof: proof.merkleProof, data: decoded };

  console.log('Calling executeDirectMinting...');
  const mintTx = await amFull.executeDirectMinting(proofStruct);
  const mintReceipt = await mintTx.wait(1);
  console.log('MINT DONE tx:', mintReceipt.hash);

  const fxrpBal = await fxrp.balanceOf(wallet.address);
  console.log('FXRP balance now:', dropsToXrp(fxrpBal.toString()), 'XRP worth of FXRP');

  // ----- Step 4: redeem -----
  const recipientXrpl = process.env.RECIPIENT_XRPL ?? process.env.XRPL_RECIPIENT ?? xrplWallet.classicAddress;
  const lots = BigInt(process.env.REDEEM_LOTS ?? '1');
  const amRedeem = new ethers.Contract(amAddr, coston2.iAssetManagerAbi, wallet);
  console.log('Approving FXRP and redeeming', lots.toString(), 'lots to', recipientXrpl);
  await (await fxrp.approve(amAddr, ethers.MaxUint256)).wait(1);
  const redeemTx = await amRedeem.redeem(lots, recipientXrpl, wallet.address, { value: 0n });
  const redeemReceipt = await redeemTx.wait(1);
  console.log('REDEEM REQUESTED tx:', redeemReceipt.hash);

  console.log('\n=== REAL ONCHAIN EVIDENCE ===');
  console.log('Mint (executeDirectMinting):', mintReceipt.hash);
  console.log('  explorer:', `https://coston2-explorer.flare.network/tx/${mintReceipt.hash}`);
  console.log('Redeem request:', redeemReceipt.hash);
  console.log('  explorer:', `https://coston2-explorer.flare.network/tx/${redeemReceipt.hash}`);
  console.log('AssetManagerFXRP:', amAddr);
  console.log('FXRP token:', fxrpAddr);
  console.log('FDC round:', roundId);
  console.log('Core Vault XRPL:', coreVaultXrpl);
  console.log('Recipient XRPL:', recipientXrpl);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });