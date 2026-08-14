import { ethers } from 'ethers';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';

const RPC = 'https://coston2-api.flare.network/ext/C/rpc';
const REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';
const REGISTRY_ABI = ['function getContractAddressByName(string name) view returns (address)'];
const AM_ADDRESS = '0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA';
const EXECUTOR_PK = process.env.EXECUTOR_PK;
const XRPL_RECIPIENT = 'rK7Ex4n9LYHReCtvnA6z9QMeZiAGrmCyMt';
const REDEEM_LOTS = 1n;

async function main() {
  if (!EXECUTOR_PK) throw new Error('EXECUTOR_PK required');
  const provider = new ethers.JsonRpcProvider(RPC, 114, { staticNetwork: true });
  const wallet = new ethers.Wallet(EXECUTOR_PK, provider);
  console.log('Executor:', wallet.address);

  // Check FXRP balance using the token address from the FAsset events
  // The minted tokens are the FAsset token - find it via the DirectMintingExecuted event
  // The mint tx was 0xfa1254104ba94aa409a3d6e7bcaf905e0d4f07b388b22d87813120d373bedc57
  // From the event: agent=0x103b384064ae85577127097a7ccadfd6fb13f437
  // The FXRP token is the fAsset of the agent. Let's find it from the agent vault.
  
  // Actually, the known FXRP token address from earlier:
  const FXRP_TOKEN = '0x0b6A3645c240605887a5532109323A3E12273dc7';
  const fxrp = new ethers.Contract(FXRP_TOKEN, [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function approve(address,uint256) returns (bool)',
    'function symbol() view returns (string)'
  ], wallet);

  const bal = await fxrp.balanceOf(wallet.address);
  const dec = await fxrp.decimals();
  const sym = await fxrp.symbol();
  console.log(`\n${sym} Balance: ${ethers.formatUnits(bal, dec)}`);

  if (bal === 0n) {
    console.log('No FXRP to redeem. Mint may have gone to a different recipient.');
    return;
  }

  // Approve AssetManager
  console.log('\nApproving AssetManager...');
  const approveTx = await fxrp.approve(AM_ADDRESS, ethers.MaxUint256);
  await approveTx.wait(1);
  console.log('Approved:', approveTx.hash);

  // Check the redeem function signature
  const am = new ethers.Contract(AM_ADDRESS, coston2.iRedeemExtendedAbi, wallet);
  console.log('\nRedeem functions:');
  coston2.iRedeemExtendedAbi.filter(a => a.type === 'function').forEach(f => {
    console.log(' ', f.name, '(' + (f.inputs || []).map(i => i.name + ':' + i.type).join(', ') + ')');
  });

  // Call redeemAmount (1 lot = lotSize in UBA)
  // lotSize is 10 XRP = 10_000_000 UBA (8 decimals)
  const lotSize = 10_000_000n; // 10 XRP in UBA
  const amountUBA = lotSize * REDEEM_LOTS;
  console.log(`\nRedeeming ${amountUBA.toString()} UBA (${REDEEM_LOTS} lot(s)) to XRPL ${XRPL_RECIPIENT}...`);
  const tx = await am.redeemAmount(amountUBA, XRPL_RECIPIENT, wallet.address);
  const receipt = await tx.wait(1);
  console.log('\n=== REDEEM TX HASH ===');
  console.log(receipt.hash);
  console.log('Explorer: https://coston2-explorer.flare.network/tx/' + receipt.hash);
  console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  console.log('Gas used:', receipt.gasUsed.toString());
}

main().catch(e => { console.error('FATAL:', e.message || e); process.exit(1); });
