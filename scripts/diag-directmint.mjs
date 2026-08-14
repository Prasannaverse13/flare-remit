import { ethers } from 'ethers';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';

const RPC = 'https://coston2-api.flare.network/ext/C/rpc';
const REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';
const REGISTRY_ABI = ['function getContractAddressByName(string name) view returns (address)'];
const provider = new ethers.JsonRpcProvider(RPC, 114, { staticNetwork: true });

async function main() {
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider);
  const amAddr = await registry.getContractAddressByName('AssetManagerFXRP');
  const am = new ethers.Contract(amAddr, coston2.iAssetManagerAbi, provider);

  const calls = {
    directMintingPaymentAddress: () => am.directMintingPaymentAddress(),
    getDirectMintingFeeBIPS: () => am.getDirectMintingFeeBIPS(),
    getDirectMintingExecutorFeeUBA: () => am.getDirectMintingExecutorFeeUBA(),
    getDirectMintingMinimumFeeUBA: () => am.getDirectMintingMinimumFeeUBA(),
    getDirectMintingHourlyLimitUBA: () => am.getDirectMintingHourlyLimitUBA(),
    getDirectMintingDailyLimitUBA: () => am.getDirectMintingDailyLimitUBA(),
    getDirectMintingLargeMintingThresholdUBA: () => am.getDirectMintingLargeMintingThresholdUBA(),
    getDirectMintingLargeMintingDelaySeconds: () => am.getDirectMintingLargeMintingDelaySeconds(),
    getDirectMintingsUnblockUntilTimestamp: () => am.getDirectMintingsUnblockUntilTimestamp(),
    mintingPaused: () => am.mintingPaused(),
    getDirectMintingHourlyLimiterState: () => am.getDirectMintingHourlyLimiterState(),
    getDirectMintingDailyLimiterState: () => am.getDirectMintingDailyLimiterState(),
    lotSize: () => am.lotSize(),
  };
  for (const [name, fn] of Object.entries(calls)) {
    try {
      const v = await fn();
      console.log(`${name}:`, typeof v === 'bigint' ? v.toString() : JSON.stringify(v, (k, x) => typeof x === 'bigint' ? x.toString() : x));
    } catch (e) {
      console.log(`${name}: ERROR ${String(e.message ?? e).slice(0, 120)}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });