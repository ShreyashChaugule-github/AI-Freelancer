import { Router, Request, Response } from "express";
import { db } from "../config/firebase";
import { runNegotiationAgent } from "../agents/agentPool";
import { syncTransaction } from "../blockchain/listener";
import * as crypto from "crypto";

const router = Router();

// Post a new job
router.post("/jobs", async (req: Request, res: Response) => {
  const { title, description, budget, clientAddress } = req.body;

  if (!title || !description || !budget || !clientAddress) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const jobId = Math.floor(Math.random() * 1000000).toString(); // simple numeric string for jobId matching contract index representation
    const jobRef = db.collection("jobs").doc(jobId);

    const job = {
      jobId,
      title,
      description,
      budget: Number(budget),
      clientAddress: clientAddress.toLowerCase(),
      status: "open",
      createdAt: new Date(),
    };

    await jobRef.set(job);
    console.log(`Job created in Firestore: ${jobId}`);

    // Trigger Negotiation Agent in background to bid on the job
    runNegotiationAgent(title, description, Number(budget))
      .then(async (proposal) => {
        const applicationId = crypto.randomUUID();
        const agentAddress = (process.env.AGENT_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000").toLowerCase();

        const application = {
          applicationId,
          jobId,
          agentAddress,
          bidAmount: proposal.bidAmount,
          proposalText: proposal.proposalText,
          durationDays: proposal.durationDays,
          status: "pending",
          createdAt: new Date(),
        };

        await db.collection("applications").doc(applicationId).set(application);
        console.log(`AI Agent Proposal submitted for Job ${jobId}: ${applicationId}`);
      })
      .catch((err) => {
        console.error(`Negotiation Agent failed for job ${jobId}:`, err);
      });

    return res.status(201).json(job);
  } catch (error: any) {
    console.error("Error creating job:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Get all jobs
router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("jobs").orderBy("createdAt", "desc").get();
    const jobs = snapshot.docs.map((doc: any) => doc.data());
    return res.json(jobs);
  } catch (error: any) {
    console.error("Error getting jobs:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Force sync a MetaMask blockchain transaction
router.post("/sync-tx", async (req: Request, res: Response) => {
  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: "Missing txHash" });
  }

  try {
    const success = await syncTransaction(txHash);
    if (success) {
      return res.json({ success: true, message: "Transaction synchronized successfully." });
    } else {
      return res.status(400).json({ success: false, error: "Transaction receipt found, but no relevant Escrow event matching targets." });
    }
  } catch (error: any) {
    console.error("Error syncing transaction:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Get project details (including deliverables & reviews)
router.get("/projects/:id", async (req: Request, res: Response) => {
  const projectId = req.params.id;

  try {
    const doc = await db.collection("projects").doc(projectId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(doc.data());
  } catch (error: any) {
    console.error("Error getting project:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Get task logs for a project
router.get("/task-logs/:projectId", async (req: Request, res: Response) => {
  const projectId = req.params.projectId;

  try {
    const snapshot = await db
      .collection("task_logs")
      .where("projectId", "==", projectId)
      .orderBy("timestamp", "asc")
      .get();

    const logs = snapshot.docs.map((doc: any) => doc.data());
    return res.json(logs);
  } catch (error: any) {
    console.error("Error getting task logs:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
