/**
 * Flare network configuration. We target Coston2 (Flare testnet) for the demo
 * but the same wiring works for Flare mainnet by swapping the RPC + chain id.
 */
import { defineChain } from 'viem';

export const COSTON2 = defineChain({
  id: 114,
  name: 'Flare Testnet Coston2',
  nativeCurrency: { name: 'Coston2 FLR', symbol: 'C2FLR', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
    public: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Coston2 Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
  },
  testnet: true,
});

/** FlareContractsRegistry is the same address on every Flare-family network. */
export const FLARE_CONTRACT_REGISTRY =
  '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as const;

/** FXRP AssetManager name as registered in the FlareContractRegistry. */
export const ASSET_MANAGER_FXRP = 'AssetManagerFXRP' as const;

/** Native XRP/USD FTSO feed id (Flare Time Series Oracle). */
export const XRP_USD_FEED_ID =
  '0x015852502f55534400000000000000000000000000' as const;

export const FXRP_DECIMALS = 6;
export const FLR_DECIMALS = 18;

export const FXRP_EXPLORER = (tx: string) =>
  `https://coston2-explorer.flare.network/tx/${tx}`;
