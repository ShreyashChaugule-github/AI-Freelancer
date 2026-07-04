import { useCallback, useState } from "react";
import { useContractRead } from "./useContract";
import { ReputationABI } from "../utils/abi";

const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS || "0x0000000000000000000000000000000000000000";

export function useReputation() {
  const { read, loading, error } = useContractRead();
  const [reputationData, setReputationData] = useState<{
    score: number;
    completedJobs: number;
    ratingAverage: number;
    totalReviews: number;
  } | null>(null);

  const fetchReputation = useCallback(async (agentAddress: string) => {
    if (!REPUTATION_ADDRESS || REPUTATION_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    try {
      const data = (await read(
        REPUTATION_ADDRESS,
        ReputationABI,
        "getReputation",
        [agentAddress as `0x${string}`]
      )) as any;

      if (data) {
        const [score, completedJobs, ratingAverage, totalReviews] = data;
        const formatted = {
          score: Number(score),
          completedJobs: Number(completedJobs),
          ratingAverage: Number(ratingAverage) / 100, // E.g., 450 -> 4.5
          totalReviews: Number(totalReviews),
        };
        setReputationData(formatted);
        return formatted;
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch reputation:", err);
      return null;
    }
  }, [read]);

  return {
    fetchReputation,
    reputationData,
    loading,
    error,
  };
}
