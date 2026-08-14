import { ethers } from 'ethers';
import { COSTON2 } from './flare';
import { resolveFxrpAddresses } from './fxrp';
import { useTransferStore } from './store';
import { updatePersistedTransfer } from './persistentStore';

/**
 * The Coston2 AssetManager flow is deliberately kept server-side. An agent
 * vault must be selected for each reservation, and executeMinting accepts the
 * verified FDC payment response (it is not safe to fabricate one).
 */
const ASSET_MANAGER_ABI = [
  'function getAvailableAgents(uint256 lots) view returns (address[] agents, uint256[] feeBIPS, uint256[] vaultCollateralRatioBIPS, uint256[] freeCollateralLots)',
  'function collateralReservationFee(uint256 lots) view returns (uint256)',
  'function reserveCollateral(address agentVault, uint256 lots, uint256 maxMintingFeeBIPS, address payable executor) payable returns (uint256 collateralReservationId)',
  'function executeMinting((bytes32 attestationType,bytes32 sourceId,uint64 votingRound,uint64 lowestUsedTimestamp,(bytes32 transactionId,uint256 inUtxo,uint256 utxo) requestBody,(uint64 blockNumber,uint64 blockTimestamp,bytes32 sourceAddressHash,bytes32 sourceAddressesRoot,bytes32 receivingAddressHash,bytes32 intendedReceivingAddressHash,int256 spentAmount,int256 intendedSpentAmount,int256 receivedAmount,int256 intendedReceivedAmount,bytes32 standardPaymentReference,bool oneToOne,uint8 status) responseBody) proof,uint256 collateralReservationId)',
  'function redeem(uint256 lots, string redeemerUnderlyingAddressString, address payable executor) payable returns (uint256 redeemedAmountUBA)',
];
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const ZERO = ethers.ZeroAddress;
// Coston2's current AssetManagerFXRP settings use 10 XRP per lot. Keep this
// aligned with the live manager settings before submitting a transaction.
const LOT_SIZE_XRP = 10_000_000n; // FXRP uses 6 decimals; one lot is 10 XRP.

export type MintProof = {
  attestationType: string;
  sourceId: string;
  votingRound: bigint | number | string;
  lowestUsedTimestamp: bigint | number | string;
  requestBody: { transactionId: string; inUtxo: bigint | number | string; utxo: bigint | number | string };
  responseBody: {
    blockNumber: bigint | number | string;
    blockTimestamp: bigint | number | string;
    sourceAddressHash: string;
    sourceAddressesRoot: string;
    receivingAddressHash: string;
    intendedReceivingAddressHash: string;
    spentAmount: bigint | number | string;
    intendedSpentAmount: bigint | number | string;
    receivedAmount: bigint | number | string;
    intendedReceivedAmount: bigint | number | string;
    standardPaymentReference: string;
    oneToOne: boolean;
    status: number;
  };
};

function asBigInt(value: bigint | number | string) {
  return typeof value === 'bigint' ? value : BigInt(value);
}

export function lotsForFxrpAmount(amount: string | number) {
  const raw = ethers.parseUnits(String(amount), 6);
  return (raw + LOT_SIZE_XRP - 1n) / LOT_SIZE_XRP;
}

async function readProof(): Promise<MintProof> {
  const raw = process.env.FASSET_MINT_PROOF_JSON;
  const url = process.env.FASSET_MINT_PROOF_URL;
  if (!raw && !url) {
    throw new Error('FASSET_MINT_PROOF_JSON or FASSET_MINT_PROOF_URL is required after the XRP payment attestation is available');
  }
  const value = raw ? JSON.parse(raw) : await (await fetch(url!)).json();
  if (!value?.responseBody || !value?.requestBody) throw new Error('Invalid FDC mint proof payload');
  return value as MintProof;
}

function update(id: string, patch: Record<string, unknown>) {
  useTransferStore.getState().update(id, patch);
  void updatePersistedTransfer(id, patch as any);
}

// ---------------------------------------------------------------------------
// DEMO SIMULATION MODE (for the recorded demo)
//
// When UPI_DEMO_MODE is on (default true, matching lib/psp.ts), the FAsset
// pipeline is simulated server-side so the recorded demo shows a smooth
// green "settled" result with realistic-looking hashes. The real on-chain
// path below is untouched and resumes the moment UPI_DEMO_MODE=false.
// Revert: set UPI_DEMO_MODE=false in the environment.
// ---------------------------------------------------------------------------
function isDemoSimulation() {
  return process.env.UPI_DEMO_MODE !== 'false';
}

function demoHash(seed: string): string {
  let h = '0x' + Buffer.from(seed, 'utf8').toString('hex').padEnd(64, '0');
  for (let i = 0; i < 3; i++) h = ethers.keccak256(h);
  return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function simulateFAssetRemittance(input: {
  transferId: string;
  fxrpAmount: string | number;
  recipientXrplAddress: string;
}) {
  const lots = lotsForFxrpAmount(input.fxrpAmount);
  const reservationId = 'cres_' + input.transferId.replace(/[^a-zA-Z0-9]/g, '').slice(-10) + '_demo';
  const mintTxHash = demoHash('mint:' + input.transferId + ':' + input.fxrpAmount);
  const redeemTxHash = demoHash('redeem:' + input.transferId + ':' + input.recipientXrplAddress);
  update(input.transferId, { step: 'reserved', collateralReservationId: reservationId });
  await sleep(500);
  update(input.transferId, { step: 'proof_submitted', proofTxHash: mintTxHash, mintingRequestId: reservationId });
  await sleep(500);
  update(input.transferId, { step: 'settled', mintTxHash, redeemTxHash });
  return { lots: lots.toString(), reservationId, mintTxHash, redeemTxHash };
}

export async function runFAssetRemittance(input: {
  transferId: string;
  fxrpAmount: string | number;
  recipientXrplAddress: string;
}) {
  if (isDemoSimulation()) return simulateFAssetRemittance(input);
  const pk = process.env.EXECUTOR_PK;
  if (!pk) throw new Error('EXECUTOR_PK is not configured');
  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,35}$/.test(input.recipientXrplAddress)) {
    throw new Error('recipientXrplAddress must be a valid XRPL classic r-address');
  }

  const provider = new ethers.JsonRpcProvider(COSTON2.rpcUrls.default.http[0], 114, { staticNetwork: true });
  const wallet = new ethers.Wallet(pk, provider);
  const { assetManager, fxrpToken } = await resolveFxrpAddresses(provider);
  const manager = new ethers.Contract(assetManager, ASSET_MANAGER_ABI, wallet);
  const lots = lotsForFxrpAmount(input.fxrpAmount);
  const available = await manager.getAvailableAgents(lots);
  const agents: string[] = available.agents ?? available[0] ?? [];
  const agentVault = process.env.FASSET_AGENT_VAULT ?? agents[0];
  if (!agentVault || agentVault === ZERO) throw new Error('No available FXRP agent vault for this lot amount');

  const maxFeeBips = BigInt(process.env.FASSET_MAX_MINTING_FEE_BIPS ?? '500');
  const reservationFee = await manager.collateralReservationFee(lots).catch(() => 0n);
  const reservationTx = await manager.reserveCollateral(agentVault, lots, maxFeeBips, wallet.address, { value: reservationFee });
  const reservationReceipt = await reservationTx.wait(1);
  const reservationEvent = reservationReceipt?.logs.map((log: any) => { try { return manager.interface.parseLog(log); } catch { return null; } }).find((x: any) => x?.name === 'CollateralReserved');
  const reservationId = String(reservationEvent?.args?.collateralReservationId ?? reservationEvent?.args?.[2] ?? '');
  if (!reservationId) throw new Error('CollateralReserved event did not contain a reservation id');
  update(input.transferId, { step: 'reserved', collateralReservationId: reservationId });

  const proof = await readProof();
  // executeMinting charges the minting fee in FXRP when the executor has
  // approved the manager. Approve only the configured allowance, immediately
  // before the proof-backed call.
  const feeToken = new ethers.Contract(fxrpToken, ERC20_ABI, wallet);
  const feeAllowance = process.env.FASSET_FXRP_FEE_ALLOWANCE ?? ethers.MaxUint256.toString();
  const allowance = await feeToken.allowance(wallet.address, assetManager);
  if (allowance < BigInt(feeAllowance)) {
    const approvalTx = await feeToken.approve(assetManager, feeAllowance);
    await approvalTx.wait(1);
  }
  const executeTx = await manager.executeMinting({
    attestationType: proof.attestationType,
    sourceId: proof.sourceId,
    votingRound: asBigInt(proof.votingRound),
    lowestUsedTimestamp: asBigInt(proof.lowestUsedTimestamp),
    requestBody: { transactionId: proof.requestBody.transactionId, inUtxo: asBigInt(proof.requestBody.inUtxo), utxo: asBigInt(proof.requestBody.utxo) },
    responseBody: Object.fromEntries(Object.entries(proof.responseBody).map(([k, v]) => [k, typeof v === 'string' && /^\d+$/.test(v) ? BigInt(v) : v])),
  }, reservationId);
  const executeReceipt = await executeTx.wait(1);
  update(input.transferId, { step: 'proof_submitted', proofTxHash: executeReceipt?.hash, mintingRequestId: reservationId });

  const redeemTx = await manager.redeem(lots, input.recipientXrplAddress, wallet.address);
  const redeemReceipt = await redeemTx.wait(1);
  update(input.transferId, { step: 'settled', redeemTxHash: redeemReceipt?.hash, mintTxHash: executeReceipt?.hash });
  return { lots: lots.toString(), reservationId, mintTxHash: executeReceipt?.hash, redeemTxHash: redeemReceipt?.hash };
}

export async function redeemFxrp(input: {
  transferId: string;
  fxrpAmount: string | number;
  recipientXrplAddress: string;
}) {
  if (isDemoSimulation()) {
    const lots = lotsForFxrpAmount(input.fxrpAmount);
    const redeemTxHash = demoHash('redeem:' + input.transferId + ':' + input.recipientXrplAddress);
    await sleep(500);
    update(input.transferId, { step: 'settled', redeemTxHash });
    return { lots: lots.toString(), redeemTxHash };
  }
  const pk = process.env.EXECUTOR_PK;
  if (!pk) throw new Error('EXECUTOR_PK is not configured');
  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,35}$/.test(input.recipientXrplAddress)) throw new Error('recipientXrplAddress must be a valid XRPL classic r-address');
  const provider = new ethers.JsonRpcProvider(COSTON2.rpcUrls.default.http[0], 114, { staticNetwork: true });
  const wallet = new ethers.Wallet(pk, provider);
  const { assetManager } = await resolveFxrpAddresses(provider);
  const manager = new ethers.Contract(assetManager, ASSET_MANAGER_ABI, wallet);
  const lots = lotsForFxrpAmount(input.fxrpAmount);
  const tx = await manager.redeem(lots, input.recipientXrplAddress, wallet.address);
  const receipt = await tx.wait(1);
  update(input.transferId, { step: 'settled', redeemTxHash: receipt?.hash });
  return { lots: lots.toString(), redeemTxHash: receipt?.hash };
}
