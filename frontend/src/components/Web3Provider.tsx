'use client';

import React from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { holesky, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';

const fhenixHelium = {
  id: 8008135,
  name: 'Fhenix Helium',
  network: 'fhenix-helium',
  nativeCurrency: {
    decimals: 18,
    name: 'tFHE',
    symbol: 'tFHE',
  },
  rpcUrls: {
    default: { http: ['https://api.helium.fhenix.zone'] },
    public: { http: ['https://api.helium.fhenix.zone'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.helium.fhenix.zone' },
  },
} as const;

const config = createConfig(
  getDefaultConfig({
    chains: [sepolia, holesky, fhenixHelium],
    transports: {
      [sepolia.id]: http(),
      [holesky.id]: http(),
      [fhenixHelium.id]: http(),
    },
    walletConnectProjectId: 'da7df9a0680eb5c30fb90234a9b5f89e',
    appName: 'SafeCompute',
  })
);

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
