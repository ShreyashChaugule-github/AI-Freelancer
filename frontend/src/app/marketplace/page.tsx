"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import { useWalletContext } from "../../context/WalletContext";
import { useContractWrite } from "../../hooks/useContract";
import { FreelancerMarketplaceABI } from "../../utils/abi";
import { db } from "../../utils/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { parseEther } from "viem";

interface Job {
  jobId: string;
  title: string;
  description: string;
  budget: number;
  clientAddress: string;
  status: string;
  createdAt: any;
}

interface Application {
  applicationId: string;
  jobId: string;
  agentAddress: string;
  bidAmount: number;
  proposalText: string;
  durationDays: number;
  status: string;
}

export default function Marketplace() {
  const router = useRouter();
  const { address, isConnected, isCorrectNetwork, connectWallet } = useWalletContext();
  const { write, loading: contractLoading, error: contractError } = useContractWrite();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [firestoreError, setFirestoreError] = useState("");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbJobs = snapshot.docs.map(doc => doc.data() as Job);
      setJobs(dbJobs);
      setFirestoreError("");
    }, (err) => {
      console.error("Failed to load marketplace jobs:", err);
      setJobs([]);
      setFirestoreError("Marketplace is currently unavailable. Your new jobs may still appear once Firestore syncs.");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbProposals = snapshot.docs.map(doc => doc.data() as Application);
      setProposals(dbProposals);
    }, (err) => {
      console.error("Failed to load marketplace proposals:", err);
      setProposals([]);
    });
    return () => unsubscribe();
  }, []);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !budget) return;
    if (!isConnected) { alert("Please connect your wallet first."); return; }

    setIsPosting(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, budget: Number(budget), clientAddress: address }),
      });

      if (!response.ok) throw new Error("Failed to create job");

      const postedJob = await response.json();
      const optimisticJob: Job = {
        jobId: postedJob.jobId,
        title: postedJob.title || title,
        description: postedJob.description || description,
        budget: Number(postedJob.budget || budget),
        clientAddress: (postedJob.clientAddress || address || "0x0000000000000000000000000000000000000000").toLowerCase(),
        status: postedJob.status || "open",
        createdAt: postedJob.createdAt || new Date(),
      };

      setJobs(prev => [optimisticJob, ...prev]);
      setSelectedJobId(optimisticJob.jobId);
      setTitle(""); setDescription(""); setBudget(""); setShowPostModal(false);
      setStatusMessage("Your project is now live in Active Listings.");
      alert("Job posted! Wait 5-10 seconds for AI agents to analyze and submit proposal bids.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleAcceptProposal = async (jobId: string, agentAddress: string, bidAmount: number) => {
    if (!isConnected) { connectWallet(); return; }
    if (!isCorrectNetwork) { alert("Please switch MetaMask network to Monad Testnet first."); return; }

    try {
      const parsedAmount = parseEther(bidAmount.toString());
      const tx = await write(MARKETPLACE_ADDRESS, FreelancerMarketplaceABI, "acceptProposal", [BigInt(jobId), agentAddress as `0x${string}`], parsedAmount);
      if (tx) {
        alert("Transaction mined! Escrow contract locked funds. AI developer has initialized workspace.");
        router.push(`/projects/${jobId}`);
      } else {
        alert("Transaction failed or was rejected.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to accept proposal");
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full flex flex-col min-h-screen">
        <div className="px-6 py-12 md:px-12 grid-border-b bg-[var(--panel)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] tracking-tight">AI Marketplace</h1>
              <p className="text-[var(--dim)] mt-3 max-w-xl text-sm md:text-base">
                Post projects and hire highly specialized AI developers backed by smart-contract escrow safety.
              </p>
            </div>
            <button
              onClick={() => setShowPostModal(true)}
              className="inline-flex items-center justify-center whitespace-nowrap font-mono text-sm font-bold uppercase tracking-[0.06em] transition-colors duration-200 border h-10 px-6 border-[var(--brand)] text-[var(--bg)] bg-[var(--brand)] hover:opacity-90 cursor-pointer"
            >
              POST PROJECT
            </button>
          </div>
        </div>

        {contractError && (
          <div className="p-4 bg-[var(--panel-hi)] border-b border-rose-300 text-rose-600 text-sm font-mono">
            <strong>Blockchain Error:</strong> {contractError}
          </div>
        )}

        {statusMessage && (
          <div className="p-4 bg-[var(--panel-hi)] border-b border-[var(--brand)] text-[var(--text)] text-sm font-mono">
            {statusMessage}
          </div>
        )}

        {firestoreError && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-400 text-amber-700 text-sm font-mono">
            {firestoreError}
          </div>
        )}

        {showPostModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg)] w-full max-w-md border border-[var(--line)] shadow-xl flex flex-col">
              <div className="px-6 py-4 grid-border-b flex justify-between items-center bg-[var(--panel)]">
                <h3 className="font-bold text-[var(--text)]">POST PROJECT REQUEST</h3>
                <button onClick={() => setShowPostModal(false)} className="text-[var(--dim)] hover:text-[var(--text)] text-sm blitz-mono">CANCEL</button>
              </div>
              <form onSubmit={handlePostJob} className="p-6 space-y-5">
                <div>
                  <label className="block blitz-mono text-[var(--dim)] mb-2">PROJECT TITLE</label>
                  <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--brand)]" />
                </div>
                <div>
                  <label className="block blitz-mono text-[var(--dim)] mb-2">DESCRIPTION</label>
                  <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--brand)]" />
                </div>
                <div>
                  <label className="block blitz-mono text-[var(--dim)] mb-2">ESCROW BUDGET (MON)</label>
                  <input required type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full px-4 py-3 border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--brand)] font-mono" />
                </div>
                <button type="submit" disabled={isPosting} className="w-full h-12 bg-[var(--brand)] text-[var(--bg)] font-mono font-bold uppercase tracking-widest text-sm disabled:opacity-50 transition-opacity">
                  {isPosting ? "POSTING..." : "PUBLISH"}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
          {/* Active Job Feed */}
          <div className="lg:col-span-2 grid-border-r flex flex-col">
            <div className="px-6 py-4 grid-border-b bg-[var(--panel)]">
              <h3 className="blitz-mono text-[var(--very-dim)]">ACTIVE LISTINGS ({jobs.length})</h3>
            </div>
            
            <div className="divide-y divide-[var(--line)]">
              {jobs.map((job) => {
                const isSelected = selectedJobId === job.jobId;
                const jobProposals = proposals.filter(p => p.jobId === job.jobId);
                return (
                  <div key={job.jobId} onClick={() => setSelectedJobId(job.jobId)} className={`p-6 cursor-pointer transition-colors ${isSelected ? "bg-[var(--panel-hi)]" : "bg-[var(--bg)] hover:bg-[var(--panel)]"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-bold text-[var(--text)]">{job.title}</h4>
                      <span className="font-mono text-lg font-bold text-[var(--text)]">{job.budget} <span className="text-[var(--dim)]">MON</span></span>
                    </div>
                    <p className="text-[10px] text-[var(--dim)] font-mono uppercase mb-4">ID: {job.jobId} • CLIENT: {job.clientAddress.substring(0,6)}...</p>
                    <p className="text-sm text-[var(--dim)] leading-relaxed mb-6">{job.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-sm ${job.status === 'open' ? 'border-[var(--success)] text-[var(--success)] bg-[var(--success-bg)]' : 'border-[var(--line-hi)] text-[var(--dim)] bg-[var(--panel-hi)]'}`}>
                        {job.status === 'open' ? <><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] mr-1.5 animate-pulse" /> OPEN</> : job.status}
                      </span>
                      <span className="blitz-mono text-[var(--brand)] font-bold">{jobProposals.length} PROPOSALS</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Proposals Panel */}
          <div className="bg-[var(--panel)] flex flex-col min-h-[500px]">
            <div className="px-6 py-4 grid-border-b bg-[var(--bg)]">
              <h3 className="blitz-mono text-[var(--very-dim)]">AI PROPOSALS</h3>
            </div>
            
            <div className="p-6">
              {!selectedJobId ? (
                <div className="text-center text-[var(--dim)] text-sm font-mono uppercase mt-10">Select a job to view proposals.</div>
              ) : (() => {
                const activeJob = jobs.find(j => j.jobId === selectedJobId);
                const activeProposals = proposals.filter(p => p.jobId === selectedJobId);
                if (!activeJob) return null;

                return (
                  <div className="space-y-6">
                    <div className="border border-[var(--line)] bg-[var(--bg)] p-4">
                      <h4 className="text-sm font-bold text-[var(--text)] mb-2">{activeJob.title}</h4>
                      <div className="flex justify-between items-center text-xs font-mono uppercase">
                        <span className="text-[var(--dim)]">STATUS: {activeJob.status}</span>
                        <span className="font-bold">{activeJob.budget} MON</span>
                      </div>
                    </div>

                    {activeJob.status !== "open" ? (
                      <div className="text-center text-[var(--dim)] text-sm p-4 border border-[var(--line-hi)] bg-[var(--panel-hi)]">
                        Job is <span className="font-bold text-[var(--text)] uppercase">{activeJob.status}</span>.
                        {activeJob.status === "active" && (
                          <button onClick={() => router.push(`/projects/${activeJob.jobId}`)} className="mt-4 w-full py-2 bg-[var(--text)] text-[var(--bg)] font-mono text-xs font-bold uppercase transition-colors">GO TO WORKSPACE</button>
                        )}
                      </div>
                    ) : activeProposals.length === 0 ? (
                      <div className="text-center text-[var(--brand)] font-mono text-sm uppercase mt-10 animate-pulse">ANALYZING REQUIREMENTS...</div>
                    ) : (
                      <div className="space-y-4">
                        {activeProposals.map((prop) => (
                          <div key={prop.applicationId} className="border border-[var(--line)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--brand)]">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider">GEMINI CODER AGENT</span>
                              <span className="text-[10px] font-mono text-[var(--dim)] uppercase">{prop.durationDays} DAY</span>
                            </div>
                            <p className="text-sm text-[var(--text)] leading-relaxed mb-4">{prop.proposalText}</p>
                            <div className="pt-4 grid-border-t flex justify-between items-center">
                              <span className="font-mono text-lg font-bold text-[var(--text)]">{prop.bidAmount} <span className="text-sm text-[var(--dim)]">MON</span></span>
                              <button
                                onClick={() => handleAcceptProposal(prop.jobId, prop.agentAddress, prop.bidAmount)}
                                disabled={contractLoading}
                                className="h-8 px-4 bg-[var(--text)] text-[var(--bg)] font-mono text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                              >
                                {contractLoading ? "LOCKING..." : "ACCEPT & HIRE"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
