import { ethers } from 'ethers';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import { readFileSync, writeFileSync } from 'fs';

const RPC = 'https://coston2-api.flare.network/ext/C/rpc';
const REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';
const DA = 'https://ctn2-data-availability.flare.network';
const REGISTRY_ABI = ['function getContractAddressByName(string name) view returns (address)'];
const VERIFIER_BASE = 'https://fdc-verifiers-testnet.flare.network';
const VERIFIER_KEY = '00000000-0000-0000-0000-000000000000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toHex32(s) { return '0x' + Buffer.from(s, 'utf8').toString('hex').padEnd(64, '0'); }

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
  if (!data.abiEncodedRequest) throw new Error('verifier failed: ' + JSON.stringify(data).slice(0, 200));
  return data.abiEncodedRequest;
}

async function fetchProofFromDALayer(abiEncodedRequest, roundId) {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${DA}/api/v1/fdc/proof-by-request-round-raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ votingRoundId: roundId, requestBytes: abiEncodedRequest }),
    });
    const data = await res.json();
    if (data.response_hex) return { merkleProof: data.proof ?? [], dataHex: data.response_hex };
    console.log('  DA layer not ready, retry', i + 1, '...');
    await sleep(15000);
  }
  throw new Error('DA layer did not produce proof after retries');
}

async function main() {
  const EXECUTOR_PK = process.env.EXECUTOR_PK;
  if (!EXECUTOR_PK) throw new Error('EXECUTOR_PK not set');
  const provider = new ethers.JsonRpcProvider(RPC, 114, { staticNetwork: true });
  const wallet = new ethers.Wallet(EXECUTOR_PK, provider);
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider);
  const amAddr = await registry.getContractAddressByName('AssetManagerFXRP');

  const txHash = process.env.EXISTING_TX_HASH;
  if (!txHash) throw new Error('Set EXISTING_TX_HASH to the XRPL tx hash');
  const transactionId = '0x' + txHash.replace('0x', '');
  console.log('Transaction ID:', transactionId);
  console.log('Executor:', wallet.address);

  // 1. Prepare attestation request
  console.log('\n--- Step 1: Prepare FDC attestation ---');
  const abiEncoded = await prepareXrpPaymentRequest(transactionId, wallet.address);
  console.log('abiEncodedRequest:', abiEncoded.slice(0, 60) + '...');

  // 2. Fetch proof from DA layer (try multiple rounds)
  console.log('\n--- Step 2: Fetch proof from DA layer ---');
  let proof;
  for (const rid of [1425199, 1425200, 1425201]) {
    console.log('Trying round', rid);
    proof = await fetchProofFromDALayer(abiEncoded, rid);
    if (proof) { console.log('Proof found in round', rid); break; }
  }
  if (!proof) throw new Error('Could not fetch proof from any round');

  // Save proof for reference
  writeFileSync('scripts/cached-proof.json', JSON.stringify(proof, null, 2));
  console.log('Proof saved to scripts/cached-proof.json');

  // 3. Decode the proof response (the response_hex is the IXRPPayment.Response, NOT the full Proof)
  console.log('\n--- Step 3: Decode proof and executeDirectMinting ---');
  const verifyFn = coston2.ixrpPaymentVerificationAbi.find(f => f.type === 'function' && f.name === 'verifyXRPPayment');
  const responseTuple = verifyFn.inputs[0].components.find(c => c.name === 'data');
  const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
    [{ type: 'tuple', components: responseTuple.components }],
    proof.dataHex
  )[0];
  // Deep clone Result into mutable objects (ethers Result is frozen)
  function deepClone(v) {
    if (typeof v === 'bigint') return v;
    if (Array.isArray(v)) return v.map(deepClone);
    if (v && typeof v === 'object') {
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = deepClone(x);
      return o;
    }
    return v;
  }
  const proofStruct = { merkleProof: proof.merkleProof.map(x => x), data: deepClone(decoded) };
  console.log('Proof decoded. Sending executeDirectMinting...');

  const amDirect = new ethers.Contract(amAddr, coston2.iDirectMintingAbi, wallet);
  const mintTx = await amDirect.executeDirectMinting(proofStruct);
  const mintReceipt = await mintTx.wait(1);
  console.log('\n=== MINT TX HASH ===');
  console.log(mintReceipt.hash);
  console.log('Explorer:', 'https://coston2-explorer.flare.network/tx/' + mintReceipt.hash);

  // 4. Check FXRP balance
  const fxrpAddr = await new ethers.Contract(amAddr, ['function fAsset() view returns (address)'], provider).fAsset();
  const fxrp = new ethers.Contract(fxrpAddr, ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function approve(address,uint256) returns (bool)'], wallet);
  const bal = await fxrp.balanceOf(wallet.address);
  const dec = await fxrp.decimals();
  console.log('\nFXRP balance:', ethers.formatUnits(bal, dec));

  // 5. Redeem
  const xrplWallet = process.env.XRPL_RECIPIENT || 'rK7Ex4n9LYHReCtvnA6z9QMeZiAGrmCyMt';
  const lots = BigInt(process.env.REDEEM_LOTS ?? '1');
  console.log('\n--- Step 4: Redeem', lots.toString(), 'lots to', xrplWallet, '---');
  await (await fxrp.approve(amAddr, ethers.MaxUint256)).wait(1);
  const amRedeem = new ethers.Contract(amAddr, coston2.iAssetManagerAbi, wallet);
  const redeemTx = await amRedeem.redeem(lots, xrplWallet, wallet.address);
  const redeemReceipt = await redeemTx.wait(1);
  console.log('\n=== REDEEM TX HASH ===');
  console.log(redeemReceipt.hash);
  console.log('Explorer:', 'https://coston2-explorer.flare.network/tx/' + redeemReceipt.hash);

  // 6. Summary
  console.log('\n\n==============================');
  console.log('  REAL ONCHAIN EVIDENCE');
  console.log('==============================');
  console.log('Mint tx:', mintReceipt.hash);
  console.log('  https://coston2-explorer.flare.network/tx/' + mintReceipt.hash);
  console.log('Redeem tx:', redeemReceipt.hash);
  console.log('  https://coston2-explorer.flare.network/tx/' + redeemReceipt.hash);
  console.log('AssetManagerFXRP:', amAddr);
  console.log('FXRP token:', fxrpAddr);
  console.log('Core Vault XRPL: rDhpmiPq4BVBDWMVdSrmkgt8thKyRzGV1p');
  console.log('FDC round:', 1425199);
  console.log('Executor:', wallet.address);
  console.log('XRPL sender:', 'rK7Ex4n9LYHReCtvnA6z9QMeZiAGrmCyMt');
  console.log('Recipient XRPL:', xrplWallet);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });