"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import { useWalletContext } from "../../context/WalletContext";
import { db } from "../../utils/firebase";
import { collection, query, orderBy, onSnapshot, doc, setDoc } from "firebase/firestore";

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
  createdAt: any;
}

export default function WorkspaceList() {
  const router = useRouter();
  const { address } = useWalletContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbProjects = snapshot.docs.map((snapDoc) => {
        const data = snapDoc.data() as Project;
        return {
          ...data,
          projectId: data.projectId || snapDoc.id,
          jobId: data.jobId || snapDoc.id,
        };
      });
      setProjects(dbProjects);
      if (dbProjects.length > 0) {
        setCreateMessage("");
      }
    }, (err) => {
      console.error("Failed to load workspaces:", err);
      setProjects([]);
      setCreateMessage("Firestore is currently unavailable, but you can still create a local workspace entry from this page.");
    });
    return () => unsubscribe();
  }, [address]);

  const handleCreateWorkspace = async () => {
    setCreating(true);
    setCreateMessage("");

    try {
      const projectId = `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newProject: Project = {
        projectId,
        jobId: projectId,
        title: "New AI Freelancer Workspace",
        clientAddress: address || "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        agentAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        escrowAddress: "0xEscrowContractAddress",
        status: "active",
        tasks: [
          { id: 1, title: "Initialize Workspace", description: "Setting up the sandbox and task queue.", status: "running" },
          { id: 2, title: "Deliverable Review", description: "Preparing the first deliverable for review.", status: "pending" },
        ],
        codeFiles: {
          "README.md": "# AI Freelancer Workspace\n\nThis workspace was created locally and is ready for development."
        },
        reviewDecision: {
          status: "Pending review",
          comments: "The workspace is ready for the next milestone.",
          score: 92,
        },
        createdAt: new Date(),
      };

      await setDoc(doc(db, "projects", projectId), newProject);
      setProjects((prev) => {
        const existing = prev.filter((item) => item.projectId !== projectId);
        return [newProject, ...existing];
      });
      setCreateMessage("Workspace created. You can enter it now.");
    } catch (err) {
      console.error(err);
      setCreateMessage("Unable to create a workspace right now.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full flex flex-col min-h-screen">
        <div className="px-6 py-12 md:px-12 grid-border-b bg-[var(--panel)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] tracking-tight">Project Workspaces</h1>
              <p className="text-[var(--dim)] mt-3 max-w-xl text-sm md:text-base">
                Access active coding sandboxes, monitor log details, review completed work, and execute on-chain releases.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateWorkspace}
                disabled={creating}
                className="h-10 px-4 border border-[var(--brand)] bg-[var(--brand)] text-[var(--bg)] font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {creating ? "CREATING..." : "CREATE WORKSPACE"}
              </button>
              <span className="blitz-mono text-[var(--dim)]">{projects.length} WORKSPACES</span>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[var(--bg)]">
          {createMessage && (
            <div className="px-6 py-3 border-b border-[var(--line)] bg-[var(--panel-hi)] text-sm text-[var(--text)] font-mono">
              {createMessage}
            </div>
          )}

          {projects.length === 0 ? (
            <div className="p-16 text-center text-[var(--dim)] font-mono text-sm uppercase">
              No active project workspaces found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0">
              {projects.map((project, idx) => (
                <div key={`${project.projectId}-${idx}`} className={`flex flex-col p-8 transition-colors hover:bg-[var(--panel-hi)] ${idx % 2 === 0 ? 'md:grid-border-r grid-border-b' : 'grid-border-b'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-[var(--text)] line-clamp-1">{project.title}</h3>
                    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-sm ${
                      project.status === 'active' ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/10' :
                      project.status === 'review' ? 'border-[#8b5cf6] text-[#8b5cf6] bg-[#8b5cf6]/10' :
                      project.status === 'completed' ? 'border-[var(--success)] text-[var(--success)] bg-[var(--success-bg)]' :
                      'border-[var(--line-hi)] text-[var(--dim)] bg-[var(--panel-hi)]'
                    }`}>
                      {project.status === 'active' ? <><span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] mr-1.5 animate-pulse" /> {project.status}</> : project.status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-[var(--dim)] font-mono uppercase mb-6">ESCROW: {project.escrowAddress.substring(0, 10)}...{project.escrowAddress.slice(-8)}</p>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="border border-[var(--line)] bg-[var(--panel)] p-3">
                      <p className="text-[10px] text-[var(--very-dim)] font-mono uppercase mb-1">CLIENT</p>
                      <p className="font-mono text-xs text-[var(--text)] truncate">{project.clientAddress}</p>
                    </div>
                    <div className="border border-[var(--line)] bg-[var(--panel)] p-3">
                      <p className="text-[10px] text-[var(--very-dim)] font-mono uppercase mb-1">FREELANCER</p>
                      <p className="font-mono text-xs text-[var(--text)] truncate">{project.agentAddress}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto grid-border-t pt-6 flex justify-between items-center">
                    <span className="text-[10px] font-mono uppercase text-[var(--dim)]">
                      {project.status === "active" ? "AI DEV IN PROGRESS" : 
                       project.status === "review" ? "DELIVERABLES READY" : 
                       project.status === "completed" ? "ON-CHAIN REGISTERED" : "REFUND FINALIZED"}
                    </span>
                    <button
                      onClick={() => router.push(`/projects/${project.projectId}`)}
                      className="h-8 px-4 bg-[var(--text)] text-[var(--bg)] font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                    >
                      ENTER WORKSPACE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
