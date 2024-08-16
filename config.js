export const CHAIN_CONFIG = {
  xchain: {
    chainId: 94524,
    chainName: "xchain",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://xchain-rpc.idex.io"],
    blockExplorerUrls: ["https://xchain-explorer.idex.io/"],
  },
  arbitrum: {
    chainId: 42161,
    chainName: "Arbitrum One",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io/"],
  },
  base: {
    chainId: 8453,
    chainName: "Base",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org/"],
  },
  optimism: {
    chainId: 10,
    chainName: "Optimism",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io/"],
  },
};