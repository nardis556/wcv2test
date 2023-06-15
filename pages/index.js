import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spacer,
  Stack,
  Textarea,
  Tooltip,
  useColorMode,
  ColorModeScript,
  useColorModeValue,
  Spinner,
} from "@chakra-ui/react";
import { InfoIcon } from "@chakra-ui/icons";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { ethers } from "ethers";
import { setTimeout } from "timers";

const defaultTrade = {
  market: "USDT-USDC",
  nonce: "3ebb6ba0-0712-11ee-a183-032e8f54ac8a",
  quantity: "33.06375000",
  side: "buy",
  type: "market",
  wallet: "0xef4d9010289f51be2b49864b5db8a01705e6348b",
};

const defaultUnlock = `Hello from the TEST team! Sign this message to prove you have control of this wallet. This won't cost you any gas fees.

Message: ea365a60-30c3-11ed-a65a-4fead7562786`;

export default function Home() {
  const [loading, setLoading] = useState(false);
  const { colorMode, toggleColorMode } = useColorMode();
  const [account, setAccount] = useState("");
  const [trade, setTrade] = useState(JSON.stringify(defaultTrade, null, 2));
  const [unlock, setUnlock] = useState(defaultUnlock);
  const [provider, setProvider] = useState(null);
  const [web3Provider, setWeb3Provider] = useState(null);

  const backgroundColor = useColorModeValue("white", "#181818");
  const textColor = useColorModeValue("black", "white");
  const buttonColorScheme = useColorModeValue("blue", "teal");
  const inputColor = useColorModeValue("gray.100", "gray.800");
  const borderColor = useColorModeValue("gray.300", "gray.600");

  async function connectWallet() {
    console.log("Connecting wallet...");
    setLoading(true);
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

  function message() {
    provider.on("message", (message) => {
      console.log("MESSAGE:", message);
    });
  }

  function disconnectWallet() {
    console.log("Disconnecting wallet...");
    provider.disconnect();
    setProvider(null);
    setWeb3Provider(null);
    setAccount("");
    console.log("Wallet disconnected");
    clearLocalStorage();
    console.log("Local storage cleared");
  }

  async function getNonce() {
    const nonce = await provider.request({
      method: "eth_getTransactionCount",
      params: [account, "latest"],
    });
    console.log("Nonce:", nonce);
    return nonce;
  }

  async function getGasPrice() {
    const gasPrice = await provider.request({
      method: "eth_gasPrice",
      params: [],
    });
    console.log("Gas price:", gasPrice);
    return gasPrice;
  }

  async function send0MaticSelf() {
    console.log("Sending transaction...");
    const transaction = {
      from: account,
      to: account,
      value: 0,
      gasPrice: await getGasPrice(),
      gas: 21000,
      nonce: await getNonce(),
      data: "0x",
    };

    console.log("Transaction details:", transaction);

    const tx = await provider.request({
      method: "eth_sendTransaction",
      params: [transaction],
    });
    console.log("SIGNED: send0MaticSelf");
    console.log(`Transaction hash: ${tx}`);
  }

  async function send001Matic0xf69() {
    console.log("Sending transaction...");
    const amountInWei = ethers.utils.parseUnits("0.001", "ether");
    const transaction = {
      from: account,
      to: "0xF691C438628B188e9F58Cd88D75B9c6AC22f3f2b",
      value: ethers.utils.hexlify(amountInWei),
      gasPrice: await getGasPrice(),
      gas: 21000,
      nonce: await getNonce(),
      data: "0x",
    };

    console.log("Transaction details:", transaction);

    const tx = await provider.request({
      method: "eth_sendTransaction",
      params: [transaction],
    });

    message();

    console.log("SIGNED: send001Matic0xf69");
    console.log(`Transaction hash: ${tx}`);
  }

  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 value) returns (boolean)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ];

  async function sendToken() {
    console.log("Sending tokens...");

    const tokenContractAddress = "0xc2132d05d31c914a87c6611c10748aeb04b58e8f";
    const tokenContract = new ethers.Contract(
      tokenContractAddress,
      ERC20_ABI,
      web3Provider.getSigner()
    );

    const decimals = await tokenContract.decimals();
    const amountInTokenUnits = ethers.utils.parseUnits("0.001", decimals);

    const tx = await tokenContract.transfer(
      "0xF691C438628B188e9F58Cd88D75B9c6AC22f3f2b",
      amountInTokenUnits
    );
    const transaction = await tx.wait();

    console.log("SIGNED: sendToken");
    console.log("Transaction hash:", transaction);
  }

  async function signMessage() {
    console.log("Signing message...");
    const params = [
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(defaultUnlock)),
      account,
    ];

    console.log("Signature parameters:", params);

    const signature = await provider.request({
      method: "personal_sign",
      params,
    });

    console.log("SIGNED: signMessage");
    console.log(`Signature: ${signature}`);
  }

  async function createSigArray(orderParams) {
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

    console.log(sigArray);

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
    console.log("SIGNED: signTrade");
    console.log(`Signature: ${signature}`);
  }

  function clearLocalStorage() {
    console.log("Clearing local storage...");
    localStorage.clear();
    window.location.reload();
  }

  return (
    <Container maxW="container.md">
      <ColorModeScript initialColorMode="dark" />
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading my={5} size="md">
          WalletConnect v2 Test (POLYGON MAINNET)
        </Heading>
        <Button onClick={toggleColorMode}>
          {colorMode === "light" ? "Dark" : "Light"}
        </Button>
      </Flex>
      <Flex justify="flex-end" mb={4}></Flex>
      <Box
        p={5}
        shadow="md"
        borderWidth="1px"
        borderRadius="md"
        w="100%"
        bg={backgroundColor}
        color={textColor}
        borderColor={borderColor}
      >
        <Flex>
          <Heading ml={4} size="md">
            {account
              ? `${account.substring(0, 5) + "~" + account.slice(-4)}`
              : "No wallet connected"}
          </Heading>
          <Spacer />
          {provider ? (
            <Button colorScheme="red" onClick={disconnectWallet}>
              Disconnect
            </Button>
          ) : (
            <Button
              colorScheme={buttonColorScheme}
              onClick={connectWallet}
              isLoading={loading}
            >
              Connect Wallet
            </Button>
          )}
        </Flex>
        <Stack spacing={6} mt={6}>
          <Button
            colorScheme={buttonColorScheme}
            onClick={send0MaticSelf}
            isDisabled={!provider}
          >
            Send 0 MATIC Self Transaction
          </Button>
          <Button
            colorScheme={buttonColorScheme}
            onClick={send001Matic0xf69}
            isDisabled={!provider}
          >
            Send 0.001 MATIC to 0xF69
          </Button>
          <Button
            colorScheme={buttonColorScheme}
            onClick={sendToken}
            isDisabled={!provider}
          >
            Send 0.001 USDT to 0xF69
          </Button>
          <Box>
            <Flex alignItems="center">
              <Textarea
                placeholder="Sign unlock request from IDEX"
                value={unlock}
                onChange={(e) => setUnlock(e.target.value)}
                isDisabled={!provider}
                bg={inputColor}
                color={textColor}
                height={110}
              />
            </Flex>
            <Button
              colorScheme={buttonColorScheme}
              onClick={signMessage}
              mt={2}
              isDisabled={!provider}
            >
              Sign Simulated Unlock
              <Tooltip label="Simulate Wallet Unlock" aria-label="A tooltip">
                <InfoIcon color="yellow.500" ml={2} />
              </Tooltip>
            </Button>
          </Box>
          <Box>
            <Flex alignItems="center">
              <Textarea
                placeholder="Enter trade parameters as JSON"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                isDisabled={!provider}
                bg={inputColor}
                color={textColor}
                height={200}
              />
            </Flex>
            <Button
              colorScheme={buttonColorScheme}
              onClick={signTrade}
              mt={2}
              isDisabled={!provider}
            >
              Sign Simulated Trade
              <Tooltip label="Simulate Trade Signature" aria-label="A tooltip">
                <InfoIcon color="yellow.500" ml={2} />
              </Tooltip>
            </Button>
          </Box>
          <Button colorScheme="red" onClick={clearLocalStorage}>
            Clear Local Storage And Refresh
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
