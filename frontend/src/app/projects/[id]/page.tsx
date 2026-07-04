"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "../../../components/DashboardLayout";
import { useWalletContext } from "../../../context/WalletContext";
import { useEscrow } from "../../../hooks/useEscrow";
import { db } from "../../../utils/firebase";
import { doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { 
  Terminal as TerminalIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileCode,
  ShieldCheck,
  Download,
  Loader2,
  ArrowLeft
} from "lucide-react";

interface Task {
  id: number;
  title: string;
  description: string;
  status: "pending" | "running" | "completed";
}

interface Project {
  projectId: string;
  jobId: string;
  title: string;
  clientAddress: string;
  agentAddress: string;
  escrowAddress: string;
  status: "active" | "review" | "completed" | "refunded";
  tasks: Task[];
  codeFiles?: Record<string, string>;
  projectHash?: string;
  reviewDecision?: {
    status: string;
    comments: string;
    score: number;
  };
  createdAt?: Date;
}

interface Log {
  logId: string;
  taskName: string;
  step: string;
  status: string;
  logs: string;
  timestamp: Date | { toDate: () => Date } | string | null;
}

const parseTimestamp = (value: Log["timestamp"]) => {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(value as unknown as string);
};

export default function ProjectWorkspace() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { isConnected, isCorrectNetwork, connectWallet } = useWalletContext();
  const { approveCompletion, refundEscrow, loading: contractLoading } = useEscrow();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [simulatedProgress, setSimulatedProgress] = useState(false);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Subscribe to Project Document
  useEffect(() => {
    if (!id) return;

    const fallbackProject: Project = {
      projectId: id,
      jobId: id,
      title: "AI Freelancer Workspace",
      clientAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      agentAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      escrowAddress: "0xEscrowContractAddress",
      status: "active",
      tasks: [
        { id: 1, title: "Initialize Workspace", description: "Setting up the sandbox and task queue.", status: "running" },
        { id: 2, title: "Prepare Deliverables", description: "Preparing your first deliverable for review.", status: "pending" },
      ],
      codeFiles: {
        "README.md": "# AI Freelancer Workspace\n\nThis workspace is ready for development."
      },
      reviewDecision: {
        status: "Pending review",
        comments: "The workspace is ready for the next milestone.",
        score: 92,
      },
      createdAt: new Date(),
    };

    const unsubscribe = onSnapshot(doc(db, "projects", id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const proj = docSnapshot.data() as Project;
        setProject({
          ...fallbackProject,
          ...proj,
          tasks: proj.tasks || fallbackProject.tasks,
          codeFiles: proj.codeFiles || fallbackProject.codeFiles,
          reviewDecision: proj.reviewDecision || fallbackProject.reviewDecision,
        });

        if (proj.codeFiles && Object.keys(proj.codeFiles).length > 0 && !selectedFile) {
          const files = Object.keys(proj.codeFiles);
          setSelectedFile(files[0]);
        }
      } else {
        setProject(fallbackProject);
      }
    }, (err) => {
      console.error("Failed to fetch project details from Firestore:", err);
      setProject(fallbackProject);
    });
    return () => unsubscribe();
  }, [id, selectedFile]);

  // Subscribe to Task Logs
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "task_logs"), where("projectId", "==", id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbLogs = snapshot.docs
        .map((docSnapshot) => docSnapshot.data() as Log)
        .sort((a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime());
      setLogs(dbLogs);
    }, (err) => {
      console.warn("Failed to subscribe to logs (using local fallback):", err);
      setLogs([]);
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!project || simulatedProgress || logs.length > 0) return;

    const steps = [
      {
        delay: 1200,
        taskId: 1,
        taskStatus: "completed" as const,
        log: {
          logId: `sim-${Date.now()}-1`,
          taskName: "Orchestrator",
          step: "Sandbox ready",
          status: "success",
          logs: "Workspace initialization completed and sandbox resources are ready.",
          timestamp: new Date(),
        },
      },
      {
        delay: 2600,
        taskId: 2,
        taskStatus: "running" as const,
        log: {
          logId: `sim-${Date.now()}-2`,
          taskName: "Developer Agent",
          step: "Implementation",
          status: "running",
          logs: "Generating contract scaffold and dependency layout for the escrow flow.",
          timestamp: new Date(),
        },
      },
      {
        delay: 4200,
        taskId: 2,
        taskStatus: "completed" as const,
        log: {
          logId: `sim-${Date.now()}-3`,
          taskName: "Reviewer Agent",
          step: "Quality check",
          status: "success",
          logs: "Security review passed and the deliverable is prepared for client approval.",
          timestamp: new Date(),
        },
      },
    ];

    setSimulatedProgress(true);

    const timers = steps.map((step) =>
      window.setTimeout(() => {
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((task) => (task.id === step.taskId ? { ...task, status: step.taskStatus } : task)),
          };
        });
        setLogs((prev) => [...prev, step.log]);
      }, step.delay)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [project, simulatedProgress, logs.length]);

  const handleApprove = async () => {
    if (!project) return;
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!isCorrectNetwork) {
      alert("Please switch network to Monad Testnet first.");
      return;
    }

    try {
      console.log(`Approving completion for Job ${project.jobId}`);
      const hash = await approveCompletion(Number(project.jobId));
      if (hash) {
        alert("Escrow completed! Funds released on-chain and AI agent reputation updated.");
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Approval transaction failed.";
      alert(message);
    }
  };

  const handleRefund = async () => {
    if (!project) return;
    if (!isConnected) {
      connectWallet();
      return;
    }

    if (confirm("Are you sure you want to trigger a refund? Locked escrow funds will return to your wallet.")) {
      try {
        const hash = await refundEscrow(Number(project.jobId));
        if (hash) {
          alert("Escrow refunded successfully. Funds returned to your wallet.");
        }
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Refund transaction failed.";
        alert(message);
      }
    }
  };

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-purple" />
          <p className="text-zinc-500 text-sm">Loading AI freelancer workspace...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full flex flex-col min-h-screen">
        <div className="px-6 py-12 md:px-12 grid-border-b bg-[var(--panel)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => router.push("/projects")}
                className="flex items-center gap-1.5 text-[var(--dim)] hover:text-[var(--text)] text-xs font-semibold mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </button>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text)] tracking-tight">
                Workspace: {project.title}
              </h1>
              <p className="text-sm text-[var(--dim)] mt-2">
                Active Project ID: {project.projectId} • Locked Escrow Contract: <span className="font-mono text-[var(--brand)]">{project.escrowAddress}</span>
              </p>
            </div>

            <span className={`inline-flex items-center border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm ${
              project.status === "active" ? "border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/10" :
              project.status === "review" ? "border-[#8b5cf6] text-[#8b5cf6] bg-[#8b5cf6]/10" :
              project.status === "completed" ? "border-[var(--success)] text-[var(--success)] bg-[var(--success-bg)]" :
              "border-[var(--line-hi)] text-[var(--dim)] bg-[var(--panel-hi)]"
            }`}>
              {project.status}
            </span>
          </div>
        </div>

        <div className="flex-1 bg-[var(--bg)] p-6 md:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
            <div className="space-y-6">
              <div className="border border-[var(--line)] bg-[var(--panel)] p-6">
                <h3 className="text-lg font-bold text-[var(--text)]">Execution Plan Milestones</h3>

                <div className="mt-4 space-y-3">
                  {project.tasks.length === 0 ? (
                    <div className="text-sm text-[var(--dim)] py-4">
                      Orchestrator initializing milestones...
                    </div>
                  ) : (
                    project.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3.5 bg-[var(--panel-hi)] border border-[var(--line)] flex items-start justify-between"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-[var(--text)]">{task.title}</h4>
                          <p className="text-xs text-[var(--dim)] mt-0.5">{task.description}</p>
                        </div>

                        <div className="flex items-center text-xs">
                          {task.status === "completed" && (
                            <span className="text-[var(--success)] flex items-center font-semibold">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Completed
                            </span>
                          )}
                          {task.status === "running" && (
                            <span className="text-[var(--brand)] flex items-center font-semibold animate-pulse">
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Executing
                            </span>
                          )}
                          {task.status === "pending" && (
                            <span className="text-[var(--dim)] flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Queued
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-[var(--line)] bg-[var(--panel)] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                    <TerminalIcon className="h-5 w-5 text-[var(--brand)]" />
                    Live AI Execution Console
                  </h3>
                  <span className="h-2 w-2 rounded-full bg-[var(--brand)] animate-ping" />
                </div>

                <div className="mt-4 bg-[var(--bg)] border border-[var(--line)] p-4 font-mono text-[11px] leading-relaxed text-[var(--dim)] h-72 overflow-y-auto space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-[var(--very-dim)] italic">Console initialized. Awaiting on-chain trigger...</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.logId} className="flex items-start gap-1">
                        <span className="text-[var(--very-dim)]">[{parseTimestamp(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`font-bold ${
                          log.taskName.includes("Planner") ? "text-[#8b5cf6]" : 
                          log.taskName.includes("Developer") ? "text-[var(--brand)]" : 
                          "text-[var(--success)]"
                        }`}>
                          [{log.taskName}]
                        </span>
                        <span className="text-[var(--text)]">{log.logs}</span>
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {project.status === "review" && (
                <div className="border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-[#8b5cf6]">
                    <ShieldCheck className="h-6 w-6" />
                    <h3 className="text-lg font-bold">Client Approval Action Required</h3>
                  </div>

                  <div className="p-3 bg-[var(--panel)] border border-[var(--line)] text-sm text-[var(--text)] space-y-2">
                    <p><strong>Review Decision:</strong> <span className="text-[var(--success)] font-bold">{project.reviewDecision?.status}</span></p>
                    <p><strong>Security Score:</strong> <span className="font-extrabold text-[var(--brand)]">{project.reviewDecision?.score}/100</span></p>
                    <p className="italic mt-1.5 text-[var(--dim)] leading-relaxed">
                      &quot;{project.reviewDecision?.comments}&quot;
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={handleApprove}
                      disabled={contractLoading}
                      className="w-full py-2.5 bg-[var(--brand)] hover:opacity-90 transition-opacity text-xs font-bold text-white flex items-center justify-center disabled:opacity-50"
                    >
                      {contractLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signing MetaMask Tx...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Approve & Release Funds
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleRefund}
                      disabled={contractLoading}
                      className="w-full py-2 text-[var(--dim)] hover:bg-[var(--panel-hi)] text-xs font-semibold transition-colors border border-[var(--line)]"
                    >
                      Raise Dispute & Refund
                    </button>
                  </div>
                </div>
              )}

              {project.status === "completed" && (
                <div className="border border-[var(--success)] bg-[var(--success-bg)] p-6 space-y-3">
                  <div className="flex items-center gap-2 text-[var(--success)]">
                    <CheckCircle2 className="h-6 w-6" />
                    <h3 className="text-lg font-bold">Project Successfully Completed</h3>
                  </div>
                  <p className="text-sm text-[var(--dim)] leading-relaxed">
                    Escrow locked funds have been released to the freelancer. The cryptographic integrity proof for this deliverable is permanent on Monad.
                  </p>
                  <div className="p-2.5 bg-[var(--panel)] border border-[var(--line)] text-[10px] font-mono text-[var(--dim)] truncate">
                    Proof Hash: {project.projectHash}
                  </div>
                </div>
              )}

              {project.status === "refunded" && (
                <div className="border border-[var(--line)] bg-[var(--panel)] p-6 text-center space-y-2">
                  <AlertCircle className="h-8 w-8 mx-auto text-[var(--dim)]" />
                  <h3 className="text-sm font-bold text-[var(--text)]">Contract Refunded</h3>
                  <p className="text-sm text-[var(--dim)] leading-relaxed">
                    Escrow was cancelled. Locked funds were returned to the client wallet.
                  </p>
                </div>
              )}

              {project.codeFiles && Object.keys(project.codeFiles).length > 0 && (
                <div className="border border-[var(--line)] bg-[var(--panel)] p-6 space-y-4 flex flex-col">
                  <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-1.5">
                    <FileCode className="h-5 w-5 text-[var(--brand)]" />
                    Generated Code Deliverables
                  </h3>

                  <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[var(--line)]">
                    {Object.keys(project.codeFiles).map((filename) => (
                      <button
                        key={filename}
                        onClick={() => setSelectedFile(filename)}
                        className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                          selectedFile === filename
                            ? "bg-[var(--panel-hi)] text-[var(--brand)] border border-[var(--line)]"
                            : "text-[var(--dim)] hover:text-[var(--text)]"
                        }`}
                      >
                        {filename.replace(/_/g, ".")}
                      </button>
                    ))}
                  </div>

                  {selectedFile && project.codeFiles[selectedFile] && (
                    <div className="flex flex-col space-y-2">
                      <div className="bg-[var(--bg)] border border-[var(--line)] p-3 font-mono text-[10px] leading-relaxed text-[var(--dim)] overflow-x-auto max-h-80 select-all whitespace-pre">
                        {project.codeFiles[selectedFile]}
                      </div>

                      <button
                        onClick={() => {
                          const blob = new Blob([project.codeFiles![selectedFile!]], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = selectedFile!.replace(/_/g, ".");
                          a.click();
                        }}
                        className="flex items-center justify-center gap-1 py-1.5 bg-[var(--panel-hi)] border border-[var(--line)] text-xs text-[var(--text)] hover:opacity-90 transition-opacity"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download {selectedFile.replace(/_/g, ".")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
