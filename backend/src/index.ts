import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import jobRouter from "./routes/jobs";
import { isFirebaseReady } from "./config/firebase";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Health Check ────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    firebase: isFirebaseReady ? "connected" : "mock-mode",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────
app.use("/api", jobRouter);

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n┌─────────────────────────────────────────────┐");
  console.log("│        FreelancerAI Backend  🤖⛓️            │");
  console.log("├─────────────────────────────────────────────┤");
  console.log(`│  Server:    http://localhost:${PORT}          │`);
  console.log(`│  Firebase:  ${isFirebaseReady ? "✅ Connected          " : "⚠️  Mock mode (no creds)"}  │`);
  console.log(`│  Gemini:    ${process.env.GEMINI_API_KEY ? "✅ API key set        " : "⚠️  No API key (add one)"}  │`);
  console.log("└─────────────────────────────────────────────┘\n");

  // Start blockchain event listener only if contracts are configured
  const escrowAddr = process.env.ESCROW_ADDRESS;
  if (escrowAddr && escrowAddr !== "0x0000000000000000000000000000000000000000") {
    try {
      const { startEventListener } = require("./blockchain/listener");
      startEventListener();
      console.log("🔗 Blockchain event listener started.");
    } catch (err: any) {
      console.error("Failed to start blockchain listener:", err.message);
    }
  } else {
    console.log("ℹ️  Blockchain listener skipped (ESCROW_ADDRESS not set).");
  }
});
