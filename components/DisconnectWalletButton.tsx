'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

export function DisconnectWalletButton() {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (isConnected) disconnect();
        router.replace('/?disconnected=1');
      }}
      className={`disconnect-wallet ${!isConnected ? 'disconnect-wallet-disabled' : ''}`}
      title={isConnected ? 'Disconnect wallet' : 'Return to wallet landing'}
    >
      <span className="disconnect-dot" /> {isConnected ? 'Disconnect' : 'Wallet offline'}
    </button>
  );
}
