import React, { useState, useEffect, useCallback } from "react";
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
  Select,
  useToast,
  Image,
} from "@chakra-ui/react";
import { InfoIcon, CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { ethers } from "ethers";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { CHAIN_CONFIG } from "../config";
import { defaultUnlock } from "../constants/params";
import {
  ethersVersion,
  walletconnectModalVersion,
  walletconnectEthereumProviderVersion,
} from "../constants/packages";

const sanitizeChainId = (chainId) =>
  typeof chainId === "string" ? parseInt(chainId, 10) : Number(chainId);

const showToast = (toast, title, description, status) => {
  toast({ title, description, status, duration: 3000, isClosable: true });
};

const showSuccessToast = (toast, title, description) =>
  showToast(toast, title, description, "success");
const showErrorToast = (toast, title, description) =>
  showToast(toast, title, description, "error");

export default function Home() {
  // State declarations
  const [state, setState] = useState({
    walletConnecting: false,
    selfETHSent: false,
    selfETHSentError: false,
    isSelfETHSentSuccess: false,
    messageSigned: false,
    messageSignedError: false,
    isMessageSignedSuccess: false,
  });
  const [account, setAccount] = useState("");
  const [unlock, setUnlock] = useState(defaultUnlock);
  const [provider, setProvider] = useState(null);
  const [browserProvider, setBrowserProvider] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [currentChain, setCurrentChain] = useState(null);
  const [walletIcon, setWalletIcon] = useState(null);

  // Hooks
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  // UI color modes
  const backgroundColor = useColorModeValue("white", "#181818");
  const textColor = useColorModeValue("black", "white");
  const buttonColorScheme = useColorModeValue("blue", "teal");
  const inputColor = useColorModeValue("gray.200", "gray.800");
  const borderColor = useColorModeValue("gray.300", "gray.600");

  // Helper functions
  const updateState = (key, value) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const initializeProvider = useCallback(async () => {
    if (!provider) return null;
    const newBrowserProvider = new ethers.BrowserProvider(provider);
    const network = await newBrowserProvider.getNetwork();
    console.log("Initialize provider network:", network);
    setBrowserProvider(newBrowserProvider);
    setCurrentChain(sanitizeChainId(network.chainId));
    return newBrowserProvider;
  }, [provider]);

  // EIP-6963 handler
  const handleAnnounceProvider = (event) => {
    const { info, provider } = event.detail;
    setAvailableProviders((prev) => {
      return prev.some((p) => p.info.uuid === info.uuid)
        ? prev
        : [...prev, { info, provider }];
    });
  };

  const validateCurrentNetwork = async (targetChainId) => {
    try {
      const currentChainId = await fetchCurrentChainId();
      const targetChainIdSanitized = sanitizeChainId(targetChainId);
      
      console.log(
        `Current chainId: ${currentChainId}, Target chainId: ${targetChainIdSanitized}`
      );
  
      const isValid = currentChainId === targetChainIdSanitized;
      console.log(`Network validation result: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error("Error validating current network:", error);
      return false;
    }
  };

  // Wallet connection functions
  const connectEIP6963Wallet = async (selectedProvider) => {
    try {
      await selectedProvider.provider.request({
        method: "eth_requestAccounts",
      });
      const newBrowserProvider = new ethers.BrowserProvider(
        selectedProvider.provider
      );
      const signer = await newBrowserProvider.getSigner();
      const account = await signer.getAddress();
      const network = await newBrowserProvider.getNetwork();
      const chainId = sanitizeChainId(network.chainId);

      setProvider(selectedProvider.provider);
      setBrowserProvider(newBrowserProvider);
      setAccount(account);
      setSelectedProvider(selectedProvider);
      setCurrentChain(chainId);
      setWalletIcon(selectedProvider.info.icon);

      selectedProvider.provider.on("accountsChanged", handleAccountsChanged);
      selectedProvider.provider.on("chainChanged", handleChainChanged);

      showSuccessToast(
        toast,
        "Wallet Connected",
        `Connected to account ${account.substring(0, 6)}...${account.substring(
          38
        )}`
      );
    } catch (error) {
      console.error("EIP-6963 wallet connection failed:", error);
      showErrorToast(
        toast,
        "Connection Failed",
        "Failed to connect EIP-6963 wallet. Please try again."
      );
    }
  };

  const initializeWalletConnect = async () => {
    try {
      const wcProvider = await EthereumProvider.init({
        projectId: "dbe9fe1215dbe847681ac3dc99af6226",
        chains: [94524], // xchain
        showQrModal: true,
      });
      
      // Ensure the provider is connected before returning
      if (!wcProvider.connected) {
        await wcProvider.connect();
      }
      
      return wcProvider;
    } catch (error) {
      console.error("WalletConnect initialization failed:", error);
      showErrorToast(
        toast,
        "WalletConnect Initialization Failed",
        "Unable to initialize WalletConnect."
      );
      throw error;
    }
  };

  const connectWalletConnect = async () => {
    try {
      const wcProvider = await initializeWalletConnect();
      const newBrowserProvider = new ethers.BrowserProvider(wcProvider);
      const signer = await newBrowserProvider.getSigner();
      const account = await signer.getAddress();
      const network = await newBrowserProvider.getNetwork();

      setProvider(wcProvider);
      setBrowserProvider(newBrowserProvider);
      setAccount(account);
      setCurrentChain(sanitizeChainId(network.chainId));

      wcProvider.on("accountsChanged", handleAccountsChanged);
      wcProvider.on("chainChanged", handleChainChanged);

      showSuccessToast(
        toast,
        "WalletConnect Connected",
        `Connected to account ${account.substring(0, 6)}...${account.substring(
          38
        )}`
      );
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      showErrorToast(
        toast,
        "WalletConnect Failed",
        "Failed to connect with WalletConnect. Please try again."
      );
    }
  };

  // Event handlers
  const handleAccountsChanged = (accounts) => {
    accounts.length === 0 ? disconnectWallet() : setAccount(accounts[0]);
  };

  const handleChainChanged = async (chainId) => {
    const newChainId = sanitizeChainId(chainId);
    setCurrentChain(newChainId);
    
    // Delete the current provider
    setProvider(null);
    setBrowserProvider(null);
    
    // Recreate the entire provider
    console.log("Recreating provider due to chain change");
    const newProvider = selectedProvider ? selectedProvider.provider : await initializeWalletConnect();
    setProvider(newProvider);
    
    const newBrowserProvider = new ethers.BrowserProvider(newProvider);
    setBrowserProvider(newBrowserProvider);
    
    const signer = await newBrowserProvider.getSigner();
    const account = await signer.getAddress();
    setAccount(account);
    
    const network = await newBrowserProvider.getNetwork();
    setCurrentChain(sanitizeChainId(network.chainId));
    
    // Re-attach event listeners
    newProvider.on("accountsChanged", handleAccountsChanged);
    newProvider.on("chainChanged", handleChainChanged);
  };

  const disconnectWallet = () => {
    if (provider?.disconnect) provider.disconnect();
    setProvider(null);
    setBrowserProvider(null);
    setAccount("");
    setSelectedProvider(null);
    setCurrentChain(null);
    setWalletIcon(null);
    showToast(toast, "Wallet Disconnected", "", "info");
  };

  // Network switching
  const switchNetwork = async (chainName) => {
    const chainInfo = CHAIN_CONFIG[chainName];
    if (!chainInfo) {
      showErrorToast(toast, "Invalid Chain", `Invalid chain name: ${chainName}`);
      return;
    }
  
    const chainIdNumber = sanitizeChainId(chainInfo.chainId);
    const formattedChainId = ethers.toQuantity(chainIdNumber);
  
    console.log(`Attempting to switch to network: ${chainName} (${formattedChainId})`);
  
    try {
      if (await validateCurrentNetwork(chainIdNumber)) {
        console.log(`Already on the correct chain: ${chainInfo.chainName}`);
        return;
      }

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: formattedChainId }],
      });
      console.log(`Switched to chain: ${formattedChainId}`);

      console.log(`Waiting for network change to take effect...`);
      await waitForNetworkChange(chainIdNumber);

      console.log(`Re-initializing provider...`);
      await initializeProvider();

      console.log(`Performing final network validation...`);
      if (!(await validateCurrentNetwork(chainIdNumber))) {
        throw new Error("Failed to switch to the correct network");
      }

      showSuccessToast(toast, "Network Switched", `Switched to ${chainInfo.chainName}`);
    } catch (error) {
      console.error(`Error switching network:`, error);
      if (error.code === 4902) {
        try {
          await addNetwork(chainInfo, formattedChainId);
          showSuccessToast(toast, "Network Added", `Added and switched to ${chainInfo.chainName}`);
        } catch (addError) {
          showErrorToast(toast, "Network Addition Failed", `Failed to add ${chainInfo.chainName}: ${addError.message}`);
        }
      } else {
        showErrorToast(toast, "Network Switch Failed", `Failed to switch to ${chainInfo.chainName}: ${error.message}`);
      }
    }
  };

  const addNetwork = async (chainInfo, formattedChainId) => {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: formattedChainId,
        chainName: chainInfo.chainName,
        nativeCurrency: chainInfo.nativeCurrency,
        rpcUrls: chainInfo.rpcUrls,
        blockExplorerUrls: chainInfo.blockExplorerUrls
      }]
    });
    console.log(`Added network: ${chainInfo.chainName}`);
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: formattedChainId }],
    });
    console.log(`Switched to newly added network: ${chainInfo.chainName}`);
  };

  const fetchCurrentChainId = async () => {
    try {
      console.log("Fetching current chain ID...");
      if (!browserProvider) {
        console.error("BrowserProvider is not initialized");
        return null;
      }
      
      const network = await browserProvider.getNetwork();
      console.log(`Fetched network:`, network);
      
      const chainId = sanitizeChainId(network.chainId);
      console.log(`Current chain ID: ${chainId}`);
      return chainId;
    } catch (error) {
      console.error("Error fetching current chain ID:", error);
      if (error.code === 'NETWORK_ERROR') {
        console.log("Network is changing, retrying...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchCurrentChainId();
      }
      throw error;
    }
  };

  const waitForNetworkChange = async (targetChainId) => {
    let retries = 0;
    const maxRetries = 10;
    const retryInterval = 1000; // 1 second
    while (retries < maxRetries) {
      console.log(`Waiting for network change, attempt ${retries + 1}/${maxRetries}`);
      try {
        const currentChainId = await fetchCurrentChainId();
        if (currentChainId === targetChainId) {
          console.log(`Network successfully changed to ${targetChainId}`);
          return;
        } else {
          console.log(`Current chain (${currentChainId}) doesn't match target chain (${targetChainId}), retrying...`);
        }
      } catch (error) {
        console.error(`Error during network change check:`, error);
        // Continue to next retry instead of breaking the loop
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
      retries++;
    }
    throw new Error("Network change timeout");
  };

  // Wallet operations
  const signMessage = async () => {
    updateState("messageSigned", true);
    try {
      const signer = await browserProvider.getSigner();
      const signature = await signer.signMessage(unlock);
      console.log("Message signed:", signature);
      updateState("isMessageSignedSuccess", true);
      showSuccessToast(toast, "Message Signed", "Message signed successfully");
    } catch (error) {
      console.error("Message signing failed:", error);
      updateState("messageSignedError", true);
      showErrorToast(toast, "Signing Failed", "Failed to sign message");
    } finally {
      updateState("messageSigned", false);
      setTimeout(() => {
        updateState("isMessageSignedSuccess", false);
        updateState("messageSignedError", false);
      }, 5000);
    }
  };

  const send0ETHSelf = async (chainName) => {
    updateState("selfETHSent", true);
    try {
      const chainInfo = CHAIN_CONFIG[chainName];
      if (!chainInfo) throw new Error(`Invalid chain name: ${chainName}`);

      const targetChainId = sanitizeChainId(chainInfo.chainId);
      if (currentChain !== targetChainId) await switchNetwork(chainName);

      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();
      const nonce = await browserProvider.getTransactionCount(address);
      const gasLimit = await browserProvider.estimateGas({
        to: address,
        value: ethers.parseEther("0"),
      });

      let transaction = {
        to: address,
        value: ethers.parseEther("0"),
        nonce: nonce,
        gasLimit: (gasLimit * BigInt(120)) / BigInt(100),
        chainId: targetChainId,
      };

      const feeData = await browserProvider.getFeeData();
      transaction.maxFeePerGas = feeData.maxFeePerGas;
      transaction.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      transaction.type = 2;

      const tx = await signer.sendTransaction(transaction);
      const receipt = await tx.wait();
      console.log(`Transaction confirmed on ${chainName}:`, receipt.hash);
      updateState("isSelfETHSentSuccess", true);
      showSuccessToast(
        toast,
        "Transaction Sent",
        `0 ETH sent to self on ${chainName}. Hash: ${tx.hash}`
      );
    } catch (error) {
      console.error(`Error sending transaction on ${chainName}:`, error);
      updateState("selfETHSentError", true);
      showErrorToast(
        toast,
        "Transaction Failed",
        `Failed to send 0 ETH to self on ${chainName}: ${error.message}`
      );
    } finally {
      updateState("selfETHSent", false);
      setTimeout(() => {
        updateState("isSelfETHSentSuccess", false);
        updateState("selfETHSentError", false);
      }, 5000);
    }
  };

  // Effects
  useEffect(() => {
    window.addEventListener("eip6963:announceProvider", handleAnnounceProvider);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () =>
      window.removeEventListener(
        "eip6963:announceProvider",
        handleAnnounceProvider
      );
  }, []);

  useEffect(() => {
    if (provider) initializeProvider();
  }, [provider, initializeProvider]);

  // UI Component
  return (
    <Container maxW="container.md">
      <ColorModeScript initialColorMode="dark" />
      <Flex justifyContent="space-between" alignItems="center" mb={1}>
        <Heading my={4} size="md">
          Test wallet stuff
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
        <Flex alignItems="center">
          <Heading size="md">
            {account ? (
              <Flex alignItems="center">
                {walletIcon && (
                  <Image
                    src={walletIcon}
                    alt="Wallet Icon"
                    boxSize="24px"
                    mr={2}
                  />
                )}
                {`${account.substring(0, 5) + "~" + account.slice(-4)}`}
              </Flex>
            ) : (
              "No wallet connected"
            )}
          </Heading>
          <Spacer />
          {provider ? (
            <Button colorScheme="red" onClick={disconnectWallet}>
              Disconnect
            </Button>
          ) : (
            <>
              <Select
                placeholder="EIP-6963 provider"
                onChange={(e) => {
                  const selected = availableProviders.find(
                    (p) => `${p.info.uuid}-${p.info.name}` === e.target.value
                  );
                  if (selected) {
                    connectEIP6963Wallet(selected);
                  }
                }}
                width="200px"
                mr={2}
              >
                {availableProviders.map((p, index) => (
                  <option
                    key={`${p.info.uuid}-${p.info.name}-${index}`}
                    value={`${p.info.uuid}-${p.info.name}`}
                  >
                    {p.info.name}
                  </option>
                ))}
              </Select>
              <Button
                colorScheme={buttonColorScheme}
                onClick={connectWalletConnect}
                isLoading={state.walletConnecting}
              >
                WalletConnect
              </Button>
            </>
          )}
        </Flex>
        <Stack spacing={4} mt={5}>
          <Box>
            <Flex alignItems="center">
              <Textarea
                placeholder="Sign message"
                value={unlock}
                onChange={(e) => setUnlock(e.target.value)}
                isDisabled={!provider}
                bg={inputColor}
                color={textColor}
                height={50}
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
              Sign Message
              <Tooltip label="Sign Message" aria-label="A tooltip">
                <InfoIcon color="yellow.500" ml={2} />
              </Tooltip>
              {state.isMessageSignedSuccess && <CheckIcon ml={2} />}
              {state.messageSignedError && <CloseIcon ml={2} />}
            </Button>
          </Box>
          <Heading size="sm" mt={4}>
            Switch Chain
          </Heading>
          <Stack direction="row" spacing={4} flexWrap="wrap">
            {Object.keys(CHAIN_CONFIG).map((chain) => (
              <Button
                key={chain}
                colorScheme={buttonColorScheme}
                onClick={() => switchNetwork(chain)}
                isDisabled={!provider}
                mb={2}
              >
                {CHAIN_CONFIG[chain].chainName}
              </Button>
            ))}
          </Stack>
          <Heading size="sm" mt={4}>
            Send 0 ETH to Self
          </Heading>
          <Stack direction="row" spacing={4} flexWrap="wrap">
            {Object.keys(CHAIN_CONFIG).map((chain) => (
              <Button
                key={chain}
                colorScheme={buttonColorScheme}
                onClick={() => send0ETHSelf(chain)}
                isDisabled={!provider}
                isLoading={state.selfETHSent}
                mb={2}
              >
                {CHAIN_CONFIG[chain].chainName}
                {state.isSelfETHSentSuccess && <CheckIcon ml={2} />}
                {state.selfETHSentError && <CloseIcon ml={2} />}
              </Button>
            ))}
          </Stack>
          <Button
            colorScheme="red"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            mt={4}
          >
            Clear Local Storage And Refresh
          </Button>
        </Stack>
      </Box>
      <Container maxW="container.md" fontSize={11} alignContent={"left"} mt={4}>
        <p>
          @walletconnect/ethereum-provider{walletconnectEthereumProviderVersion}
        </p>
        <p>@walletconnect/modal{walletconnectModalVersion}</p>
        <p>@ethers{ethersVersion}</p>
      </Container>
    </Container>
  );
}
