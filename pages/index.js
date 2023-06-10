
import { useState } from "react";
import { v1 as uuidv1 } from "uuid";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { ethers } from "ethers";


/**
Order input example:
{
  "market": "USDT-USDC",
  "nonce": "3ebb6ba0-0712-11ee-a183-032e8f54ac8a",
  "quantity": "33.06375000",
  "side": "buy",
  "type": "market",
  "wallet": "0xef4d9010289f51be2b49864b5db8a01705e6348b"
}
*/

const defaultTrade = {
  "market": "USDT-USDC",
  "nonce": "3ebb6ba0-0712-11ee-a183-032e8f54ac8a",
  "quantity": "33.06375000",
  "side": "buy",
  "type": "market",
  "wallet": "0xef4d9010289f51be2b49864b5db8a01705e6348b"
};


export default function Home() {
  const [account, setAccount] = useState("");
  const [message, setMessage] = useState("");
  const [trade, setTrade] = useState(JSON.stringify(defaultTrade, null, 2));
  const [provider, setProvider] = useState(null);
  const [web3Provider, setWeb3Provider] = useState(null);
  

  async function connectWallet() {
    console.log("Connecting wallet...");
    const provider = await EthereumProvider.init({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
      chains: [137],
      showQrModal: true,
      rpcMap: {
        137: "https://polygon-rpc.com",
      },
    });
  
    await provider.enable();
  
    const web3Provider = new ethers.providers.Web3Provider(provider);
    const signer = web3Provider.getSigner();
    const account = await signer.getAddress();
  
    console.log("Wallet connected:", account);
  
    setProvider(provider);
    setWeb3Provider(web3Provider);
    setAccount(account);
  }
  

  async function sendTransaction() {
    console.log("Sending transaction...");
    const transaction = {
      from: account,
      to: account,
      value: 0,
    };
  
    console.log("Transaction details:", transaction);
  
    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [transaction],
    });
  
    console.log(`Transaction hash: ${txHash}`);
  }
  

  async function signMessage() {
    console.log("Signing message...");
    const params = [
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message)),
      account,
    ];
  
    console.log("Signature parameters:", params);
  
    const signature = await provider.request({
      method: "personal_sign",
      params,
    });
  
    console.log(`Signature: ${signature}`);
  }
  

  async function createSigArray(orderParams) {
    console.log(orderParams);
    if (!orderParams || typeof orderParams !== "object") {
      console.error("Invalid orderParams");
      return null;
    }

    const nonceAsByteArray = ethers.utils.arrayify(
      `0x${orderParams.nonce.replace(/-/g, "")}`
    );

    return [
      ["uint8", 4],
      ["uint128", nonceAsByteArray],
      ["address", orderParams.wallet],
      ["string", orderParams.market],
      ["uint8", 0],
      ["uint8", 0],
      ["string", orderParams.quantity],
      ["bool", false],
      ["string", ""],
      ["string", ""],
      ["string", ""],
      ["uint8", 0],
      ["uint8", 0],
      ["uint64", 0],
    ];
  }

  const buildSigHashParams = async (signatureParameters) => {
    console.log(signatureParameters);
    let fields = signatureParameters.map((param) => param[0]);
    let values = signatureParameters.map((param) => param[1]);
    return ethers.utils.solidityKeccak256(fields, values);
  };

  async function signTrade() {
    if (!provider) {
      console.error("Provider is not connected");
      return;
    }
  
    console.log("Signing trade...");
    let tradeParams;
  
    try {
      tradeParams = JSON.parse(trade);
    } catch (error) {
      console.error("Invalid trade parameters");
      return;
    }
  
    console.log("Trade parameters:", tradeParams);
  
    const sigArray = await createSigArray(tradeParams);
    if (!sigArray) {
      console.error("Failed to create signature array");
      return;
    }
  
    const signatureParametersHash = await buildSigHashParams(sigArray);
    if (!signatureParametersHash) {
      console.error("Failed to build signature parameters hash");
      return;
    }
  
    console.log("Signature parameters hash:", signatureParametersHash);
  
    const signature = await provider.request({
      method: "personal_sign",
      params: [signatureParametersHash, account],
    });
  
    console.log(`Signature: ${signature}`);
  }
  

  function clearLocalStorage() {
    localStorage.clear();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
      }}
    >
      <div>
      <button style={{ padding: "10px" }} onClick={connectWallet}>
        Connect Wallet
      </button>
      </div>
      <button style={{ padding: "10px" }} onClick={sendTransaction}>
        Send Transaction
      </button>
      <input
        style={{ padding: "10px", width: "300px" }}
        placeholder="Enter message to sign"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button style={{ padding: "10px" }} onClick={signMessage}>
        Sign Message
      </button>
      <textarea
        style={{ padding: "10px", width: "500px", height: "160px" }}
        placeholder="Enter trade parameters as JSON"
        value={trade}
        onChange={(e) => setTrade(e.target.value)}
      />
      <button style={{ padding: "10px" }} onClick={signTrade}>
        Sign Trade
      </button>
      <button style={{ padding: "10px" }} onClick={clearLocalStorage}>
        Clear Local Storage
      </button>
    </div>
  );
}
