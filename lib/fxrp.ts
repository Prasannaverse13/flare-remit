/**
 * FAsset onchain address resolution. The recommended pattern is to look
 * everything up via the FlareContractRegistry at runtime — never hardcode
 * the AssetManager or FXRP token addresses.
 */
import { ethers } from 'ethers';
import {
  ASSET_MANAGER_FXRP,
  COSTON2,
  FLARE_CONTRACT_REGISTRY,
  FXRP_DECIMALS,
} from './flare';

const REGISTRY_ABI = [
  'function getContractAddressByName(string name) view returns (address)',
];

const ASSET_MANAGER_MIN_ABI = [
  'function fAsset() view returns (address)',
  'function getSettings() view returns (tuple(uint256 assetMintingGranularity,uint256 assetDecimals,uint256 assetMintLimit,uint256 assetMintLimitUSD,uint256 minCollateralRatioBIPS,uint256 safetyMinCollateralRatioBIPS,uint256 redemptionFeeBIPS,uint256 redemptionDefaultMaxLots,uint256 redemptionCollateralThresholdBIPS,uint256 mintingCapCollateralThresholdBIPS,uint256 mintingCapCollateralThresholdBIPSDefault,uint256 mintingCapCollateralThresholdBIPSFallback,uint256 collateralReservationFeeBIPS,uint256 mintingPoolHoldingsRequiredBIPS,uint256 maxTrustedMintingAgents,uint256 maxAvailableLots,uint256 lotSizeAMG,address assetSymbol,address assetName,address ftsoSymbol,address assetManagerController,address flrAsset,address wnat,address priceReader,address fdc,address flareDataConnector,address agentOwnerRegistry,address agentVaultFactory,address collateralPoolFactory,address collateralPoolTokenFactory,address poolWhitelist,address vaultWhitelist,address paymentVerifier,address redemptionContract,address flipLiquidationContract,address flipLiquidatorContract,address priceChangeEmitter))',
  'function getAvailableAgents(uint256 lots) view returns (address[] memory agents, uint256[] memory feeBIPS, uint256[] memory vauls, uint256[] memory freeCollateralLots)',
  'function collateralReservationFee(uint256 lots) view returns (uint256)',
  'function reserveCollateral(address agentVault, uint256 lots, uint256 feeBIPS, address executor) payable',
  'function executeMinting(bytes data, uint256 collateralReservationId) payable',
  'function redemptionRequest(uint256 lots, uint256 maxPremiumBIPS, address executor, address recipient) payable',
  'function selfMint(uint256 lots, uint256 maxPremiumBIPS) payable',
];

const FXRP_ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

export interface ResolvedFAsset {
  assetManager: string;
  fxrpToken: string;
  settings: any;
}

export function getReadProvider() {
  return new ethers.JsonRpcProvider(COSTON2.rpcUrls.default.http[0], 114, {
    staticNetwork: true,
  });
}

export async function resolveFxrpAddresses(
  provider: ethers.JsonRpcProvider = getReadProvider(),
): Promise<ResolvedFAsset> {
  const registry = new ethers.Contract(
    FLARE_CONTRACT_REGISTRY,
    REGISTRY_ABI,
    provider,
  );
  const assetManager = await registry.getContractAddressByName(ASSET_MANAGER_FXRP);
  const am = new ethers.Contract(assetManager, ASSET_MANAGER_MIN_ABI, provider);
  const fxrpToken = await am.fAsset();
  // Settings are useful for UI diagnostics but are not required to resolve
  // the manager/token pair; some registry versions expose a newer tuple.
  const settings = await am.getSettings().catch(() => null);
  return { assetManager, fxrpToken, settings };
}

export function fxrpContract(tokenAddress: string, runner: ethers.ContractRunner) {
  return new ethers.Contract(tokenAddress, FXRP_ERC20_ABI, runner);
}

export function assetManagerContract(
  managerAddress: string,
  runner: ethers.ContractRunner,
) {
  return new ethers.Contract(managerAddress, ASSET_MANAGER_MIN_ABI, runner);
}

/** Format a raw bigint of FXRP (6 decimals) to a human string. */
export function formatFxrp(raw: bigint | string, dp = 2): string {
  const v = typeof raw === 'string' ? BigInt(raw) : raw;
  const whole = v / 10n ** BigInt(FXRP_DECIMALS);
  const frac = v % 10n ** BigInt(FXRP_DECIMALS);
  const fracStr = frac.toString().padStart(FXRP_DECIMALS, '0').slice(0, dp);
  return `${whole.toString()}.${fracStr}`;
}

export function parseFxrp(human: string): bigint {
  const [w, f = ''] = human.split('.');
  const frac = (f + '0'.repeat(FXRP_DECIMALS)).slice(0, FXRP_DECIMALS);
  return BigInt(w ?? '0') * 10n ** BigInt(FXRP_DECIMALS) + BigInt(frac || '0');
}
