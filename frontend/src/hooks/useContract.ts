import { useState, useCallback } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { monadTestnet } from "./useWallet";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz";

export function useContractRead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async (
    address: string,
    abi: any,
    functionName: string,
    args: any[] = []
  ) => {
    setLoading(true);
    setError(null);
    try {
      const client = createPublicClient({
        chain: monadTestnet,
        transport: http(RPC_URL),
      });

      const data = await client.readContract({
        address: address as `0x${string}`,
        abi,
        functionName,
        args,
      });
      return data;
    } catch (err: any) {
      console.error(`Contract read error for ${functionName}:`, err);
      setError(err.message || "Failed to read contract");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { read, loading, error };
}

export function useContractWrite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const write = useCallback(async (
    address: string,
    abi: any,
    functionName: string,
    args: any[] = [],
    value?: bigint
  ) => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask is not connected");
      setLoading(false);
      return null;
    }

    try {
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http(RPC_URL),
      });

      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum),
      });

      const [account] = await walletClient.getAddresses();
      if (!account) {
        throw new Error("No connected account found");
      }

      console.log(`Writing contract ${functionName} with args:`, args);

      // Estimate gas
      let gasLimit;
      try {
        gasLimit = await publicClient.estimateContractGas({
          address: address as `0x${string}`,
          abi,
          functionName,
          args,
          account,
          value,
        });
        // add 10% buffer max per Monad gas guidelines
        gasLimit = gasLimit + (gasLimit / 10n);
      } catch (gasErr) {
        console.warn("Gas estimation failed, using default limit:", gasErr);
      }

      // Write
      const hash = await walletClient.writeContract({
        address: address as `0x${string}`,
        abi,
        functionName,
        args,
        account,
        value,
        gas: gasLimit,
      });

      setTxHash(hash);
      console.log(`Transaction sent. Hash: ${hash}`);

      // Wait for confirmation
      console.log("Waiting for block confirmation on Monad Testnet...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("Transaction confirmed:", receipt);

      // Call backend REST endpoint to trigger fast sync with Firestore
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        await fetch(`${backendUrl}/api/sync-tx`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ txHash: hash }),
        });
        console.log("State synced to Firestore successfully.");
      } catch (syncErr) {
        console.error("Failed to trigger backend Firestore sync:", syncErr);
      }

      return hash;
    } catch (err: any) {
      console.error(`Contract write error for ${functionName}:`, err);
      setError(err.message || "Failed to execute transaction");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { write, loading, error, txHash };
}
