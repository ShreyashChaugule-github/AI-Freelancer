import { useCallback } from "react";
import { useContractWrite, useContractRead } from "./useContract";
import { EscrowABI } from "../utils/abi";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000";

export function useEscrow() {
  const { write, loading: writeLoading, error: writeError, txHash } = useContractWrite();
  const { read, loading: readLoading, error: readError } = useContractRead();

  const getEscrowDetails = useCallback(async (jobId: number) => {
    if (!ESCROW_ADDRESS) return null;
    return read(ESCROW_ADDRESS, EscrowABI, "getEscrow", [BigInt(jobId)]);
  }, [read]);

  const approveCompletion = useCallback(async (jobId: number) => {
    if (!ESCROW_ADDRESS) throw new Error("Escrow contract address not configured");
    return write(ESCROW_ADDRESS, EscrowABI, "approveCompletion", [BigInt(jobId)]);
  }, [write]);

  const refundEscrow = useCallback(async (jobId: number) => {
    if (!ESCROW_ADDRESS) throw new Error("Escrow contract address not configured");
    return write(ESCROW_ADDRESS, EscrowABI, "refund", [BigInt(jobId)]);
  }, [write]);

  return {
    getEscrowDetails,
    approveCompletion,
    refundEscrow,
    loading: writeLoading || readLoading,
    error: writeError || readError,
    txHash,
  };
}
