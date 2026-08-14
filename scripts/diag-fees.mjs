import { ethers } from 'ethers';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';

const RPC = 'https://coston2-api.flare.network/ext/C/rpc';
const REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';
const REGISTRY_ABI = ['function getContractAddressByName(string name) view returns (address)'];
const provider = new ethers.JsonRpcProvider(RPC, 114, { staticNetwork: true });

async function main() {
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider);

  // FDC hub + fee configs
  const fdcHub = await registry.getContractAddressByName('FdcHub');
  const feeCfgAddr = await registry.getContractAddressByName('FdcRequestFeeConfigurations');
  console.log('FdcHub:', fdcHub);
  console.log('FdcRequestFeeConfigurations:', feeCfgAddr);

  const feeCfg = new ethers.Contract(feeCfgAddr, coston2.iFdcRequestFeeConfigurationsAbi, provider);

  // sample XRPPayment abiEncodedRequest (for a txid; fee should be per-type)
  const sample = '0x5852505061796d656e7400000000000000000000000000000000000000000000746573745852500000000000000000000000000000000000000000000000000098ab2c791767542ca1bf72f329a8137123866001ece9d0dc37d778762d5aece4cafb4c1a5035e626ca27b1478f35304c0bc8d2708f56ef2e8616e8bfd1185e6b0000000000000000000000008070c21dbd21be7fe0956681e0bfb0d8c5544186';
  const fee = await feeCfg.getRequestFee(sample);
  console.log('getRequestFee:', fee.toString(), 'wei |', ethers.formatEther(fee), 'C2FLR');

  // Direct minting helper to compute required payment
  const amAddr = await registry.getContractAddressByName('AssetManagerFXRP');
  const am = new ethers.Contract(amAddr, coston2.iAssetManagerAbi, provider);
  const [executorFee, feeBIPS, minFee, mintPaused] = await Promise.all([
    am.getDirectMintingExecutorFeeUBA(),
    am.getDirectMintingFeeBIPS(),
    am.getDirectMintingMinimumFeeUBA(),
    am.mintingPaused(),
  ]);
  console.log('executorFeeUBA:', executorFee.toString(), 'feeBIPS:', feeBIPS.toString(), 'minFeeUBA:', minFee.toString(), 'mintingPaused:', mintPaused);

  // Compute payment for a 10 XRP net mint
  const netMintUBA = 10n * 1000000n;
  const prop = (netMintUBA * feeBIPS) / 10000n;
  const mintFee = prop > minFee ? prop : minFee;
  const total = netMintUBA + mintFee + executorFee;
  console.log('for net 10 XRP: mintFeeUBA=', mintFee.toString(), 'total UBA=', total.toString(), '=>', Number(total) / 1000000, 'XRP to send');

  // Check min redeem amount + redemption params
  const minRedeem = await am.minimumRedeemAmountUBA().catch((e) => 'ERR ' + String(e));
  const redemptionFee = await am.systemRedemptionFeeBIPS().catch((e) => 'ERR ' + String(e));
  console.log('minimumRedeemAmountUBA:', typeof minRedeem === 'bigint' ? minRedeem.toString() : minRedeem);
  console.log('systemRedemptionFeeBIPS:', typeof redemptionFee === 'bigint' ? redemptionFee.toString() : redemptionFee);
}
main().catch((e) => { console.error(e); process.exit(1); });