import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { db } from "../config/firebase";
import { runExecutionWorkflow } from "../agents/agentPool";
import { FreelancerMarketplaceABI, EscrowABI } from "./abi";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://testnet-rpc.monad.xyz";
const MARKETPLACE_ADDRESS = (process.env.MARKETPLACE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const ESCROW_ADDRESS = (process.env.ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const AGENT_WALLET_ADDRESS = (process.env.AGENT_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000").toLowerCase();

// Custom chain for Monad Testnet
const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
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

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

/**
 * Handle Escrow creation (when client locks payment)
 * This triggers the Planner -> Developer -> Reviewer LangGraph workflow.
 */
async function handleEscrowCreated(jobId: bigint, client: string, freelancer: string, amount: bigint) {
  console.log(`EscrowCreated Event: Job ${jobId}, Client ${client}, Agent ${freelancer}, Amount ${amount}`);
  
  // Save/Update escrow in Firestore
  const escrowId = `escrow_${jobId.toString()}`;
  await db.collection("escrows").doc(escrowId).set({
    escrowAddress: ESCROW_ADDRESS,
    projectId: jobId.toString(),
    jobId: jobId.toString(),
    amount: Number(amount) / 1e18, // convert to Monad token decimal
    status: "locked",
    clientAddress: client.toLowerCase(),
    agentAddress: freelancer.toLowerCase(),
    createdAt: new Date()
  });

  // Log transaction
  await db.collection("transactions").add({
    from: client.toLowerCase(),
    to: ESCROW_ADDRESS.toLowerCase(),
    amount: Number(amount) / 1e18,
    type: "escrow_lock",
    status: "confirmed",
    jobId: jobId.toString(),
    timestamp: new Date()
  });

  // If the freelancer is our AI Agent, kick off the background LangGraph workflow
  if (freelancer.toLowerCase() === AGENT_WALLET_ADDRESS) {
    console.log(`Matching Agent accepted for Job ${jobId}. Initializing AI LangGraph workflow...`);
    
    // Find job details in Firestore
    const jobDoc = await db.collection("jobs").doc(jobId.toString()).get();
    let title = "Custom Development Project";
    let description = "FreelancerAI on-chain development task.";

    if (jobDoc.exists) {
      const jobData = jobDoc.data();
      title = jobData?.title || title;
      description = jobData?.description || description;
      await jobDoc.ref.update({ status: "active" });
    }

    // Initialize project workspace in Firestore
    const projectId = jobId.toString();
    await db.collection("projects").doc(projectId).set({
      projectId,
      jobId: jobId.toString(),
      title,
      clientAddress: client.toLowerCase(),
      agentAddress: freelancer.toLowerCase(),
      escrowAddress: ESCROW_ADDRESS,
      status: "active",
      tasks: [],
      codeFiles: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Run LangGraph agents asynchronously
    runExecutionWorkflow(
      projectId,
      jobId.toString(),
      title,
      description,
      Number(amount) / 1e18
    ).catch(err => console.error("Workflow trigger error:", err));
  }
}

/**
 * Handle Escrow release (when client approves completion)
 */
async function handleEscrowReleased(jobId: bigint, freelancer: string, amount: bigint, projectHash: string) {
  console.log(`EscrowReleased Event: Job ${jobId}, Freelancer ${freelancer}, Amount ${amount}, Hash ${projectHash}`);

  const projectId = jobId.toString();

  // Update project status in DB
  await db.collection("projects").doc(projectId).update({
    status: "completed",
    proofTxHash: projectHash,
    updatedAt: new Date()
  });

  // Update job status in DB
  await db.collection("jobs").doc(projectId).update({
    status: "completed"
  });

  // Update escrow status in DB
  await db.collection("escrows").doc(`escrow_${projectId}`).update({
    status: "released"
  });

  // Update Agent reputation in DB
  const agentRepRef = db.collection("agent_reputation").doc(freelancer.toLowerCase());
  const agentRepDoc = await agentRepRef.get();
  if (agentRepDoc.exists) {
    const currentData = agentRepDoc.data();
    await agentRepRef.update({
      score: (currentData?.score || 0) + 10,
      completedProjects: (currentData?.completedProjects || 0) + 1,
    });
  } else {
    await agentRepRef.set({
      agentAddress: freelancer.toLowerCase(),
      score: 10,
      completedProjects: 1,
      ratingAverage: 5.0
    });
  }

  // Update Portfolio
  const portfolioId = `portfolio_${projectId}`;
  const projectDoc = await db.collection("projects").doc(projectId).get();
  const projectData = projectDoc.data();

  await db.collection("portfolio").doc(portfolioId).set({
    portfolioId,
    agentAddress: freelancer.toLowerCase(),
    projectId,
    title: projectData?.title || "On-Chain Deliverable",
    description: `Successfully completed project under escrow. On-chain proof registered.`,
    proofTxHash: projectHash,
    timestamp: new Date()
  });

  // Log transaction
  await db.collection("transactions").add({
    from: ESCROW_ADDRESS.toLowerCase(),
    to: freelancer.toLowerCase(),
    amount: Number(amount) / 1e18,
    type: "escrow_release",
    status: "confirmed",
    jobId: jobId.toString(),
    timestamp: new Date()
  });
}

/**
 * Handle Escrow refund
 */
async function handleEscrowRefunded(jobId: bigint, client: string, amount: bigint) {
  console.log(`EscrowRefunded Event: Job ${jobId}, Client ${client}, Amount ${amount}`);
  const projectId = jobId.toString();

  await db.collection("projects").doc(projectId).update({
    status: "refunded",
    updatedAt: new Date()
  });

  await db.collection("jobs").doc(projectId).update({
    status: "cancelled"
  });

  await db.collection("escrows").doc(`escrow_${projectId}`).update({
    status: "refunded"
  });

  // Log transaction
  await db.collection("transactions").add({
    from: ESCROW_ADDRESS.toLowerCase(),
    to: client.toLowerCase(),
    amount: Number(amount) / 1e18,
    type: "refund",
    status: "confirmed",
    jobId: jobId.toString(),
    timestamp: new Date()
  });
}

/**
 * Sync transaction by parsing receipt and logs
 */
export async function syncTransaction(txHash: string): Promise<boolean> {
  try {
    console.log(`Syncing transaction hash: ${txHash}`);
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    for (const log of receipt.logs) {
      try {
        // Try decoding as Escrow event
        const decoded = decodeEventLog({
          abi: EscrowABI,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === "EscrowCreated") {
          const { jobId, client, freelancer, amount } = decoded.args as any;
          await handleEscrowCreated(jobId, client, freelancer, amount);
          return true;
        } else if (decoded.eventName === "EscrowReleased") {
          const { jobId, freelancer, amount, projectHash } = decoded.args as any;
          await handleEscrowReleased(jobId, freelancer, amount, projectHash);
          return true;
        } else if (decoded.eventName === "EscrowRefunded") {
          const { jobId, client, amount } = decoded.args as any;
          await handleEscrowRefunded(jobId, client, amount);
          return true;
        }
      } catch (err) {
        // Not an Escrow event or decoding failed, continue
      }
    }
    return false;
  } catch (error) {
    console.error(`Sync transaction error for ${txHash}:`, error);
    return false;
  }
}

/**
 * Daemon Event Listener (Optional background poller)
 */
export function startEventListener() {
  console.log("Starting blockchain background listener...");
  
  // NOTE: Monad Concepts Skill recommends tracking 'finalized' blocks for critical operations
  // like Escrow releases. Viem watchEvent defaults to 'latest' (Proposed state).
  // In a production environment, consider polling getLogs({ blockTag: "finalized" }) 
  // or using the Envio HyperIndex indexer as recommended by monskills.

  // Watch for EscrowCreated
  publicClient.watchEvent({
    address: ESCROW_ADDRESS,
    event: parseAbiItem("event EscrowCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount)"),
    onLogs: async (logs) => {
      for (const log of logs) {
        const { jobId, client, freelancer, amount } = log.args;
        if (jobId && client && freelancer && amount) {
          await handleEscrowCreated(jobId, client, freelancer, amount);
        }
      }
    }
  });

  // Watch for EscrowReleased
  publicClient.watchEvent({
    address: ESCROW_ADDRESS,
    event: parseAbiItem("event EscrowReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount, bytes32 projectHash)"),
    onLogs: async (logs) => {
      for (const log of logs) {
        const { jobId, freelancer, amount, projectHash } = log.args;
        if (jobId && freelancer && amount && projectHash) {
          await handleEscrowReleased(jobId, freelancer, amount, projectHash);
        }
      }
    }
  });
}
