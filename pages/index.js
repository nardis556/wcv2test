import { useState } from "react";
import { FaGithub } from "react-icons/fa";
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
  IconButton,
} from "@chakra-ui/react";
import { InfoIcon, CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { ethers } from "ethers";

import { defaultTrade, defaultUnlock } from "../constants/params";
import {
  ethersVersion,
  walletconnectModalVersion,
  walletconnectEthereumProviderVersion,
} from "../constants/packages";

import { ERC20_ABI } from "../utils/abi";

export default function Home() {
  const [state, setState] = useState({
    walletConnecting: false,

    selfMaticSent: false,
    selfMaticSentError: false,
    isSelfMaticSentSuccess: false,

    maticTo0xf69Sent: false,
    maticTo0xf69SentError: false,
    isMaticTo0xf69SentSuccess: false,

    usdtTo0xf69Sent: false,
    usdtTo0xf69SentError: false,
    isUsdtTo0xf69SentSuccess: false,

    messageSigned: false,
    messageSignedError: false,
    isMessageSignedSuccess: false,

    tradeSigned: false,
    tradeSignedError: false,
    isTradeSignedSuccess: false,

    automateFlowStarted: false,
    automateFlowStartedError: false,
    isAutomateFlowStartedSuccess: false,
  });

  const updateState = (key, value) => {
    setState((prevState) => ({ ...prevState, [key]: value }));
  };

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
    updateState("walletConnecting", true);
    try {
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

      updateState("walletConnecting", false);
    } catch (e) {
      console.log(e);
      clearLocalStorage();
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function submitTx(method, params, name) {
    console.log(
      "\n----------START----------",
      name,
      "----------START----------\n"
    );
    const mode =
      method === "eth_sendTransaction"
        ? "Sending Transaction"
        : "Signing Message";
    if (method === "eth_sendTransaction") {
      params.chainId = 137;
      params.type = 2;
    }
    try {
      const tx = await provider.request({
        method: method,
        params: method === "eth_sendTransaction" ? [params] : params,
      });
      console.log(`${mode} for ${name}`);
      console.log("Transaction params:");
      console.log(params);
      console.log(
        mode === "Sending Transaction" ? "TRANSACTION SENT" : "MESSAGE SIGNED"
      );
      console.log(tx);
      console.log(
        "\n----------END----------",
        name,
        "----------END----------\n"
      );
      return tx;
    } catch (e) {
      console.log(`${mode} for ${name}`);
      console.log("Transaction params:");
      console.log(params);
      console.log(
        mode === "Sending Transaction" ? "TRANSACTION FAILED" : "MESSAGE FAILED"
      );
      console.log(e);
      console.log(
        "\n----------END----------",
        name,
        "----------END----------\n"
      );
      return e;
    }
  }

  async function automateFlow() {
    updateState("automateFlowStarted", true);
    const sleepIncrement = 2000;

    try {
      console.log("Starting automated flow...");

      if (!provider) {
        await connectWallet();
      }

      await sleep(sleepIncrement);

      console.log("Automated flow: Signing Simulated Unlock");
      await signMessage();
      await sleep(sleepIncrement);

      console.log("Automated flow: sending 0 MATIC to self");
      let nonce = await getNonce();
      await send0MaticSelf(nonce);
      await sleep(sleepIncrement);

      console.log("Automated flow: sending DUST MATIC to 0xF69");
      nonce = ethers.utils.hexlify(ethers.BigNumber.from(nonce).add(1));
      await sendDustMatic0xf69(nonce);
      await sleep(sleepIncrement);

      console.log("Automated flow: sending DUST USDT to 0xF69");
      nonce = ethers.utils.hexlify(ethers.BigNumber.from(nonce).add(1));
      await sendDustUSDTto0xf69(nonce);
      await sleep(sleepIncrement);

      console.log("Automated flow: Signing Simulated Trade.");
      await signTrade();

      alert("Automated Flow Done. Please Check Console For Errors.");
      updateState("automateFlowStarted", false);
    } catch (error) {
      updateState("automateFlowStartedError", true);
      console.error(
        "An error occurred during the automated flow:",
        JSON.stringify(error, null, 2)
      );
      alert(
        `An error occurred during the automated flow. See console for more info${JSON.stringify(
          error,
          null,
          2
        )}`
      );
    } finally {
      setTimeout(() => {
        updateState("automateFlowStarted", false);
        updateState("automateFlowStartedError", false);
        updateState("isAutomateFlowStartedSuccess", false);
      }, 5000);
    }
  }

  async function disconnectWallet() {
    console.log("Disconnecting wallet...");
    provider.disconnect();
    setProvider(null);
    setWeb3Provider(null);
    setAccount("");
    console.log("Wallet disconnected");
    clearLocalStorage();
    console.log("Local storage cleared");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  async function getNonce() {
    let nonce;
    try {
      nonce = await web3Provider.getTransactionCount(account, "pending");
      return ethers.utils.hexlify(nonce);
    } catch (e) {
      console.error(e);
      return e;
    }
  }

  async function getGasPrices() {
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

  async function send0MaticSelf(nonce) {
    updateState("selfMaticSent", true);
    try {
      const { maxFee, maxPriorityFee } = await getGasPrices();
      const transaction = {
        from: account,
        to: account,
        value: ethers.utils.hexlify(0),
        maxPriorityFeePerGas: ethers.utils.hexlify(maxPriorityFee),
        maxFeePerGas: ethers.utils.hexlify(maxFee),
        gas: ethers.utils.hexlify(21000),
        nonce: nonce ? nonce : await getNonce(),
        data: "0x",
      };
      await submitTx("eth_sendTransaction", transaction, "0 MATIC to self");
      updateState("isSelfMaticSentSuccess", true);
    } catch (e) {
      console.error(e);
      updateState("selfMaticSentError", true);
      return e;
    } finally {
      updateState("selfMaticSent", false);
      setTimeout(() => {
        updateState("isSelfMaticSentSuccess", false);
        updateState("selfMaticSentError", false);
      }, 5000);
    }
  }

  async function sendDustMatic0xf69(nonce) {
    updateState("maticTo0xf69Sent", true);
    try {
      const { maxFee, maxPriorityFee } = await getGasPrices();
      const amountInWei = ethers.utils.parseUnits("0.000001", "ether");
      const transaction = {
        from: account,
        to: "0xF691C438628B188e9F58Cd88D75B9c6AC22f3f2b",
        value: ethers.utils.hexlify(amountInWei),
        maxPriorityFeePerGas: ethers.utils.hexlify(maxPriorityFee),
        maxFeePerGas: ethers.utils.hexlify(maxFee),
        gas: ethers.utils.hexlify(21000),
        nonce: nonce ? nonce : await getNonce(),
        data: "0x",
      };
      await submitTx("eth_sendTransaction", transaction, "DUST MATIC to 0xF69");
      updateState("isMaticTo0xf69SentSuccess", true);
    } catch (e) {
      console.error(e);
      updateState("maticTo0xf69SentError", true);
      return e;
    } finally {
      updateState("maticTo0xf69Sent", false);
      setTimeout(() => {
        updateState("isMaticTo0xf69SentSuccess", false);
        updateState("maticTo0xf69SentError", false);
      }, 5000);
    }
  }

  async function sendDustUSDTto0xf69(nonce) {
    updateState("usdtTo0xf69Sent", true);
    try {
      const tokenContractAddress = "0xc2132d05d31c914a87c6611c10748aeb04b58e8f";
      const tokenContract = new ethers.Contract(
        tokenContractAddress,
        ERC20_ABI,
        web3Provider.getSigner()
      );
      const decimals = await tokenContract.decimals();
      const amountInTokenUnits = ethers.utils.parseUnits("0.000001", decimals);

      const { maxFee, maxPriorityFee } = await getGasPrices();

      const transactionParams = {
        from: account,
        to: tokenContractAddress,
        data: tokenContract.interface.encodeFunctionData("transfer", [
          "0xF691C438628B188e9F58Cd88D75B9c6AC22f3f2b",
          amountInTokenUnits,
        ]),
        maxPriorityFeePerGas: ethers.utils.hexlify(maxPriorityFee),
        maxFeePerGas: ethers.utils.hexlify(maxFee),
        gas: ethers.utils.hexlify(100000),
        nonce: nonce ? nonce : await getNonce(),
      };
      await submitTx(
        "eth_sendTransaction",
        transactionParams,
        "DUST USDT to 0xF69"
      );
      updateState("isUsdtTo0xf69SentSuccess", true);
    } catch (e) {
      console.error(e);
      updateState("usdtTo0xf69SentError", true);
      return e;
    } finally {
      updateState("usdtTo0xf69Sent", false);
      setTimeout(() => {
        updateState("isUsdtTo0xf69SentSuccess", false);
        updateState("usdtTo0xf69SentError", false);
      }, 5000);
    }
  }

  async function signMessage() {
    updateState("messageSigned", true);
    try {
      const params = [
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(defaultUnlock)),
        account,
      ];
      await submitTx("personal_sign", params, "Simulated Unlock.");
      updateState("isMessageSignedSuccess", true);
    } catch (e) {
      console.error(e);
      updateState("messageSignedError", true);
      return e;
    } finally {
      updateState("messageSigned", false);
      setTimeout(() => {
        updateState("isMessageSignedSuccess", false);
        updateState("messageSignedError", false);
      }, 5000);
    }
  }

  async function createSigArray(orderParams) {
    try {
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
    } catch (e) {
      console.error(e);
      return e;
    }
  }

  const buildSigHashParams = async (signatureParameters) => {
    try {
      let fields = signatureParameters.map((param) => param[0]);
      let values = signatureParameters.map((param) => param[1]);
      return ethers.utils.solidityKeccak256(fields, values);
    } catch (e) {
      console.error(e);
      return e;
    }
  };

  async function signTrade() {
    updateState("tradeSigned", true);
    try {
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

      await submitTx(
        "personal_sign",
        [account, signatureParametersHash],
        "Simulated Trade."
      );
      updateState("isTradeSignedSuccess", true);
    } catch (e) {
      console.error(e);
      updateState("tradeSignedError", true);
      return e;
    } finally {
      updateState("tradeSigned", false);
      setTimeout(() => {
        updateState("isTradeSignedSuccess", false);
        updateState("tradeSignedError", false);
      }, 5000);
    }
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
        <Heading my={4} size="md">
          WalletConnect v2 Test (POLYGON MAINNET)
          <Tooltip label="View Source">
            <IconButton
              as="a"
              href="https://github.com/nardis556/wcv2test"
              aria-label="GitHub"
              icon={<FaGithub />}
            />
          </Tooltip>
        </Heading>
        <Button onClick={toggleColorMode} width={100}>
          {colorMode === "light" ? "Dark" : "Light"}
        </Button>
      </Flex>
      <Flex justify="flex-end" mb={4}></Flex>
      <Box
        p={5}
        shadow="md"
        borderWidth="1.5px"
        borderRadius="md"
        w="100%"
        bg={backgroundColor}
        color={textColor}
        borderColor={borderColor}
      >
        <Flex>
          <Heading size="md">
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
              isLoading={state.walletConnecting}
            >
              Connect Wallet
            </Button>
          )}
        </Flex>
        <Stack spacing={4} mt={5}>
          <Button
            colorScheme={buttonColorScheme}
            onClick={() => send0MaticSelf()}
            isDisabled={!provider}
            isLoading={state.selfMaticSent}
          >
            Send 0 MATIC Self Transaction
            {state.isSelfMaticSentSuccess && <CheckIcon ml={2} />}
            {state.selfMaticSentError && <CloseIcon ml={2} />}
          </Button>
          <Button
            colorScheme={buttonColorScheme}
            onClick={() => sendDustMatic0xf69()}
            isDisabled={!provider}
            isLoading={state.maticTo0xf69Sent}
          >
            Send DUST MATIC to 0xF69
            {state.isMaticTo0xf69SentSuccess && <CheckIcon ml={2} />}
            {state.maticTo0xf69SentError && <CloseIcon ml={2} />}
          </Button>
          <Button
            colorScheme={buttonColorScheme}
            onClick={() => sendDustUSDTto0xf69()}
            isDisabled={!provider}
            isLoading={state.usdtTo0xf69Sent}
          >
            Send DUST USDT to 0xF69
            {state.isUsdtTo0xf69SentSuccess && <CheckIcon ml={2} />}
            {state.usdtTo0xf69SentError && <CloseIcon ml={2} />}
          </Button>
          <Box>
            <Flex alignItems="center">
              <Textarea
                placeholder="Sign simulated unlock message"
                value={unlock}
                onChange={(e) => setUnlock(e.target.value)}
                isDisabled={!provider}
                bg={inputColor}
                color={textColor}
                height={90}
                fontSize={11}
              />
            </Flex>
            <Button
              colorScheme={buttonColorScheme}
              onClick={signMessage}
              mt={2}
              isDisabled={!provider}
              isLoading={state.messageSigned}
              width={260}
            >
              Sign Simulated Unlock
              <Tooltip label="Simulate Trade Signature" aria-label="A tooltip">
                <InfoIcon color="yellow.500" ml={2} />
              </Tooltip>
              {state.isMessageSignedSuccess && <CheckIcon ml={2} />}
              {state.messageSignedError && <CloseIcon ml={2} />}
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
                height={120}
                fontSize={11}
              />
            </Flex>
            <Button
              colorScheme={buttonColorScheme}
              onClick={signTrade}
              mt={2}
              isDisabled={!provider}
              isLoading={state.tradeSigned}
              width={260}
            >
              Sign Simulated Trade
              <Tooltip label="Simulate Trade Signature" aria-label="A tooltip">
                <InfoIcon color="yellow.500" ml={2} />
              </Tooltip>
              {state.isTradeSignedSuccess && <CheckIcon ml={2} />}
              {state.tradeSignedError && <CloseIcon ml={2} />}
            </Button>
          </Box>
          <Button
            colorScheme={buttonColorScheme}
            onClick={automateFlow}
            isDisabled={!provider}
            isLoading={state.automateFlowStarted}
          >
            Automate Flow
            {state.isAutomateFlowSuccess && <CheckIcon ml={2} />}
            {state.automateFlowError && <CloseIcon ml={2} />}
          </Button>
          <Button colorScheme="red" onClick={clearLocalStorage}>
            Clear Local Storage And Refresh
          </Button>
        </Stack>
      </Box>
      <Container maxW="container.md" fontSize={11} alignContent={"left"}>
        <p>
          @walletconnect/ethereum-provider{walletconnectEthereumProviderVersion}
        </p>
        <p>@walletconnect/modal{walletconnectModalVersion}</p>
        <p>@ethers{ethersVersion}</p>
      </Container>
    </Container>
  );
}
