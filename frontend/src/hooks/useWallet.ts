import { useState, useEffect, useCallback } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 10143;
const CHAIN_HEX = "0x" + CHAIN_ID.toString(16);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz";

export const monadTestnet = {
  id: CHAIN_ID,
  name: CHAIN_ID === 1337 ? "Monad Localhost" : "Monad Testnet",
  network: CHAIN_ID === 1337 ? "monad-localhost" : "monad-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
};

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkNetwork = useCallback((id: number) => {
    setChainId(id);
    const correct = id === CHAIN_ID;
    setIsCorrectNetwork(correct);
    return correct;
  }, []);

  const switchNetwork = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_HEX }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: CHAIN_HEX,
                chainName: CHAIN_ID === 1337 ? "Monad Localhost" : "Monad Testnet",
                nativeCurrency: {
                  name: "Monad",
                  symbol: "MON",
                  decimals: 18,
                },
                rpcUrls: [RPC_URL],
                blockExplorerUrls: CHAIN_ID === 1337 ? [] : ["https://explorer.monad.xyz/"],
              },
            ],
          });
          return true;
        } catch (addError: any) {
          setError(`Failed to add Network: ${addError.message}`);
          return false;
        }
      }
      setError(`Failed to switch to Network: ${switchError.message}`);
      return false;
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install it to interact with FreelancerAI.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const addr = accounts[0];
        setAddress(addr);
        setIsConnected(true);

        const currentChainIdHex = await window.ethereum.request({
          method: "eth_chainId",
        });
        const currentChainId = parseInt(currentChainIdHex, 16);
        const correct = checkNetwork(currentChainId);

        if (!correct) {
          await switchNetwork();
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, [checkNetwork, switchNetwork]);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
    setChainId(null);
  }, []);

  // Listen to account/chain changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    // Check if already connected
    window.ethereum.request({ method: "eth_accounts" }).then(async (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
        checkNetwork(parseInt(chainIdHex, 16));
      }
    });

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      checkNetwork(parseInt(chainIdHex, 16));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [checkNetwork, disconnectWallet]);

  return {
    address,
    isConnected,
    isCorrectNetwork,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };
}
