import packageJson from "../package.json";

export const walletconnectEthereumProviderVersion =
  packageJson.dependencies["@walletconnect/ethereum-provider"];
export const walletconnectModalVersion =
  packageJson.dependencies["@walletconnect/modal"];
export const ethersVersion = packageJson.dependencies["ethers"];