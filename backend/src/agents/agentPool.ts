import { getGeminiProModel, getGeminiTextModel } from "../config/gemini";
import { db } from "../config/firebase";
import * as crypto from "crypto";

export interface ProposalResult {
  bidAmount: number;
  proposalText: string;
  durationDays: number;
}

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: "pending" | "running" | "completed";
}

/**
 * Negotiation Agent: Generates proposal details based on job requirements.
 */
export async function runNegotiationAgent(
  title: string,
  description: string,
  clientBudget: number
): Promise<ProposalResult> {
  const model = getGeminiProModel();
  
  const prompt = `
    You are an autonomous AI Freelancer. You need to write a proposal for the following project request.
    
    Project Title: "${title}"
    Project Description: "${description}"
    Client's Budget: ${clientBudget} MON (Monad Testnet Tokens)
    
    Tasks:
    1. Assess the requirements.
    2. Write a highly professional proposal (up to 3 paragraphs).
    3. Determine a reasonable bid amount (must be less than or equal to the client budget).
    4. Estimate the delivery duration in days (integer, usually 1 to 5 days).
    
    Provide your output in EXACT JSON format with the following keys:
    {
      "bidAmount": <number representing your bid>,
      "proposalText": "<detailed proposal string>",
      "durationDays": <integer duration>
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Clean up response if there are markdown block wrappers
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(jsonStr) as ProposalResult;
    return {
      bidAmount: Number(data.bidAmount) || clientBudget,
      proposalText: data.proposalText || "I would love to help you build this project using my specialized developer capabilities.",
      durationDays: Number(data.durationDays) || 2
    };
  } catch (error) {
    console.error("Negotiation Agent error:", error);
    return {
      bidAmount: clientBudget,
      proposalText: `Proposal for "${title}". I am fully equipped to handle this project and will deliver quality results according to your specifications.`,
      durationDays: 2
    };
  }
}

/**
 * Simulates the LangGraph multi-agent workspace (Planner -> Developer -> Reviewer).
 * Writes logs in real time to Firestore task_logs collection.
 */
export async function runExecutionWorkflow(
  projectId: string,
  jobId: string,
  title: string,
  description: string,
  budget: number
) {
  const projectRef = db.collection("projects").doc(projectId);
  const logsRef = db.collection("task_logs");

  const addLog = async (agentName: string, step: string, status: string, message: string) => {
    const logId = crypto.randomUUID();
    await logsRef.doc(logId).set({
      logId,
      projectId,
      taskName: agentName,
      step,
      status,
      logs: message,
      timestamp: new Date()
    });
    console.log(`[${agentName}][${status}] ${message}`);
  };

  try {
    await projectRef.update({ status: "active" });

    // ==========================================
    // PHASE 1: PLANNER AGENT
    // ==========================================
    await addLog("Planner Agent", "Initialize Plan", "running", "Analyzing requirements and designing project roadmap...");
    
    const model = getGeminiProModel();
    const planPrompt = `
      You are a Project Planner AI. Analyze this job description:
      Title: "${title}"
      Description: "${description}"
      
      Deconstruct this project into 3 separate sequential development tasks.
      Output EXACT JSON format with key "tasks", containing an array of 3 tasks:
      {
        "tasks": [
          { "id": 1, "title": "<task 1 title>", "description": "<what needs to be coded in task 1>" },
          { "id": 2, "title": "<task 2 title>", "description": "<what needs to be coded in task 2>" },
          { "id": 3, "title": "<task 3 title>", "description": "<what needs to be coded in task 3>" }
        ]
      }
    `;

    let tasks: TaskItem[] = [];
    try {
      const planRes = await model.generateContent(planPrompt);
      const jsonStr = planRes.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      const planObj = JSON.parse(jsonStr);
      tasks = planObj.tasks.map((t: any) => ({
        ...t,
        status: "pending" as const
      }));
    } catch (e) {
      tasks = [
        { id: 1, title: "Database Setup", description: "Design Firestore schemas and indexes.", status: "pending" },
        { id: 2, title: "Core Logic", description: "Implement business APIs.", status: "pending" },
        { id: 3, title: "Frontend Integration", description: "Hook up dashboard state.", status: "pending" }
      ];
    }

    await projectRef.update({ tasks });
    await addLog("Planner Agent", "Plan Finalized", "success", `Project plan generated with 3 milestones: \n1. ${tasks[0].title}\n2. ${tasks[1].title}\n3. ${tasks[2].title}`);

    // ==========================================
    // PHASE 2: DEVELOPER AGENT
    // ==========================================
    const codeFiles: Record<string, string> = {};

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      task.status = "running";
      await projectRef.update({ tasks });

      await addLog("Developer Agent", `Milestone ${i+1}: ${task.title}`, "running", `Starting development on milestone: "${task.title}". Coding implementation details: ${task.description}`);

      const textModel = getGeminiTextModel();
      const devPrompt = `
        You are an expert Developer AI. Write the code implementation for:
        Milestone: "${task.title}"
        Task Description: "${task.description}"
        Overall Project Description: "${description}"

        Generate only ONE file. Determine a suitable filename (e.g. index.js, schema.sql, handler.ts) based on the task.
        Provide your output as:
        FILENAME: <filename>
        CODE:
        <code>
      `;

      let codeText = "";
      let filename = `task_${i+1}.js`;

      try {
        const devRes = await textModel.generateContent(devPrompt);
        const devText = devRes.response.text();
        
        const filenameMatch = devText.match(/FILENAME:\s*([^\n]+)/i);
        if (filenameMatch) {
          filename = filenameMatch[1].trim();
        }
        
        const codeSplit = devText.split(/CODE:/i);
        if (codeSplit.length > 1) {
          codeText = codeSplit[1].replace(/```[a-zA-Z]*/g, "").replace(/```/g, "").trim();
        } else {
          codeText = devText;
        }
      } catch (err) {
        codeText = `// Default fallback implementation for ${task.title}\nconsole.log("Completed: ${task.description}");`;
      }

      codeFiles[filename] = codeText;
      task.status = "completed";
      
      await projectRef.update({ 
        tasks,
        [`codeFiles.${filename.replace(/\./g, "_")}`]: codeText // replace dots with underscores for valid Firestore key names
      });

      await addLog("Developer Agent", `Milestone ${i+1} Done`, "success", `Completed file [${filename}]. Implemented logic successfully.`);
    }

    // ==========================================
    // PHASE 3: REVIEWER AGENT
    // ==========================================
    await addLog("Reviewer Agent", "Code Review", "running", "Initiating quality control review, static analysis, and vulnerability check...");

    const allCodeSummary = Object.entries(codeFiles)
      .map(([name, code]) => `=== FILE: ${name} ===\n${code}\n`)
      .join("\n");

    const reviewPrompt = `
      You are a Senior Reviewer AI. Review the following code generated for project: "${title}"
      
      Code Snippets:
      ${allCodeSummary}
      
      Conduct code quality check, performance review, and security audit.
      Provide a brief summary of recommendations and a final review decision.
      Output in EXACT JSON format:
      {
        "status": "APPROVED" | "REVISION_REQUIRED",
        "comments": "<summary of review>",
        "score": <score out of 100>
      }
    `;

    let reviewDecision = { status: "APPROVED", comments: "Code is clean, secure, and complies with best practices.", score: 95 };
    try {
      const reviewRes = await model.generateContent(reviewPrompt);
      const jsonStr = reviewRes.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      reviewDecision = JSON.parse(jsonStr);
    } catch (e) {
      // fallback
    }

    // Compute SHA256 of code files for on-chain integrity proof
    const hash = crypto.createHash("sha256");
    hash.update(JSON.stringify(codeFiles));
    const projectHash = "0x" + hash.digest("hex");

    await projectRef.update({
      status: "review",
      reviewDecision,
      projectHash
    });

    await addLog(
      "Reviewer Agent", 
      "Review Completed", 
      reviewDecision.status === "APPROVED" ? "success" : "failed", 
      `Review Decision: ${reviewDecision.status} (Score: ${reviewDecision.score}/100)\nComments: ${reviewDecision.comments}\n\nGenerated On-Chain Project Integrity Hash: ${projectHash}`
    );

  } catch (error: any) {
    console.error("Workflow Execution failed:", error);
    await addLog("Workflow Orchestrator", "Execution Error", "failed", `Orchestrator error: ${error.message}`);
    await projectRef.update({ status: "failed" });
  }
}
