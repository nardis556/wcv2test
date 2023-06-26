import { ethers } from "ethers";

export async function getNonce(web3Provider, account) {
  let nonce;
  try {
    nonce = await web3Provider.getTransactionCount(account, "pending");
    return ethers.utils.hexlify(nonce);
  } catch (e) {
    console.error(e);
    return e;
  }
}

export async function getGasPrices() {
  try {
    const response = await fetch("https://gasstation.polygon.technology/v2");
    const data = await response.json();
    const maxFee = ethers.utils
      .parseUnits(data.fast.maxFee.toString(), "gwei")
      .mul(2)
      .add(1);
    const maxPriorityFee = ethers.utils
      .parseUnits(data.fast.maxPriorityFee.toString(), "gwei")
      .mul(2)
      .add(1);
    return { maxFee, maxPriorityFee };
  } catch (e) {
    console.error(e);
    return e;
  }
}
