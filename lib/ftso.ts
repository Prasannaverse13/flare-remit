/**
 * FTSO (Flare Time Series Oracle) price feed. Used to compute the
 * fair value of one FXRP at quote time so the fee comparison widget
 * can show real numbers instead of hardcoded ones.
 */
import { ethers } from 'ethers';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import { createPublicClient, http, encodeFunctionData } from 'viem';
import {
  COSTON2,
  FLARE_CONTRACT_REGISTRY,
  XRP_USD_FEED_ID,
} from './flare';

const REGISTRY_ABI = [
  {
    name: 'getContractAddressByName',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
];

export interface FtxoQuote {
  /** Price in USD per whole XRP, scaled by 1e5 (FTSO convention). */
  priceUsdScaled: number;
  /** Convenience: USD value of 1 XRP as a JS number. */
  xrpUsd: number;
  /** Unix ms timestamp of the feed. */
  timestamp: number;
  /** Source label for UI. */
  source: 'ftso';
}

export async function getXrpUsdFromFtso(): Promise<FtxoQuote | null> {
  try {
    const client = createPublicClient({
      chain: COSTON2,
      transport: http(),
    });
    const registryAddr = FLARE_CONTRACT_REGISTRY as `0x${string}`;
    const ftsoAddr = (await client.readContract({
      address: registryAddr,
      abi: REGISTRY_ABI as any,
      functionName: 'getContractAddressByName',
      args: ['FtsoV2'],
    })) as `0x${string}`;

    const raw = (await client.readContract({
      address: ftsoAddr,
      abi: coston2.ftsoV2InterfaceAbi as any,
      functionName: 'getFeedById',
      args: [XRP_USD_FEED_ID as `0x${string}`],
    })) as readonly [bigint, bigint, number];

    const [value, , timestamp] = raw;
    return {
      priceUsdScaled: Number(value),
      xrpUsd: Number(value) / 1e5,
      timestamp: Number(timestamp) * 1000,
      source: 'ftso',
    };
  } catch (err) {
    // FTSO read is best-effort; UI falls back to a static price.
    console.warn('[ftso] read failed, falling back to mock price', err);
    return null;
  }
}
