import { ethers } from 'ethers';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';

const RPC = 'https://coston2-api.flare.network/ext/C/rpc';
const REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';
const REGISTRY_ABI = ['function getContractAddressByName(string name) view returns (address)'];
const amAbi = coston2.iAssetManagerAbi;

const provider = new ethers.JsonRpcProvider(RPC, 114, { staticNetwork: true });

async function main() {
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider);
  const amAddr = await registry.getContractAddressByName('AssetManagerFXRP');
  console.log('AssetManagerFXRP:', amAddr);
  const am = new ethers.Contract(amAddr, amAbi, provider);

  const lotSize = await am.lotSize();
  const mintDecimals = await am.assetMintingDecimals();
  console.log('lotSize (UBA):', lotSize.toString(), '| assetMintingDecimals:', mintDecimals.toString());

  const settings = await am.getSettings();
  const useful = {
    fAsset: settings.fAsset,
    agentOwnerRegistry: settings.agentOwnerRegistry,
    fdcVerification: settings.fdcVerification,
    assetDecimals: settings.assetDecimals,
    assetMintingDecimals: settings.assetMintingDecimals,
    assetUnitUBA: settings.assetUnitUBA.toString(),
    assetMintingGranularityUBA: settings.assetMintingGranularityUBA.toString(),
    lotSizeAMG: settings.lotSizeAMG.toString(),
    mintingCapAMG: settings.mintingCapAMG.toString(),
    collateralReservationFeeBIPS: Number(settings.collateralReservationFeeBIPS),
    redemptionFeeBIPS: Number(settings.redemptionFeeBIPS),
    maxRedeemedTickets: Number(settings.maxRedeemedTickets),
    mintingPoolHoldingsRequiredBIPS: Number(settings.mintingPoolHoldingsRequiredBIPS),
  };
  console.log('settings:', JSON.stringify(useful, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  // list available agents
  const [agents, total] = await am.getAvailableAgentsDetailedList(0, 20);
  console.log('available agents:', agents.length, 'total in list:', total.toString());
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    console.log(`  #${i} vault=${a.agentVault} owner=${a.ownerManagementAddress} feeBIPS=${a.feeBIPS} freeLots=${a.freeCollateralLots} status=${a.status}`);
  }

  // reservation fee for 1 lot
  const fee = await am.collateralReservationFee(1);
  console.log('collateralReservationFee(1):', fee.toString());

  // redemption contract / payment verifier info
  const fdcAddr = settings.fdcVerification;
  console.log('fdcVerification:', fdcAddr);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });