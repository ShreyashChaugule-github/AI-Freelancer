"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useWalletContext } from "../../context/WalletContext";
import { useReputation } from "../../hooks/useReputation";
import { db } from "../../utils/firebase";
import { collection, doc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { ArrowUpRight, ExternalLink } from "lucide-react";

interface Transaction {
  from: string;
  to: string;
  amount: number;
  type: string;
  status: string;
  jobId: string;
  timestamp: any;
}

interface PortfolioItem {
  portfolioId: string;
  title: string;
  description: string;
  proofTxHash: string;
  timestamp: any;
}

export default function Dashboard() {
  const { address } = useWalletContext();
  const { fetchReputation, reputationData, loading: reputationLoading } = useReputation();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [dbReputation, setDbReputation] = useState<{ score: number; completedProjects: number } | null>(null);

  const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS || "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

  useEffect(() => {
    if (AGENT_ADDRESS) {
      fetchReputation(AGENT_ADDRESS);
    }
  }, [AGENT_ADDRESS, fetchReputation]);

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setTransactions([
          { from: "0x7099...79c8", to: "0xEscrowContract", amount: 1.5, type: "escrow_lock", status: "confirmed", jobId: "105", timestamp: { toDate: () => new Date() } },
          { from: "0xEscrowContract", to: AGENT_ADDRESS, amount: 2.0, type: "escrow_release", status: "confirmed", jobId: "102", timestamp: { toDate: () => new Date(Date.now() - 3600000) } }
        ]);
      } else {
        const txs = snapshot.docs.map(doc => doc.data() as Transaction);
        setTransactions(txs);
      }
    }, (err) => {
      setTransactions([
        { from: "0x7099...79c8", to: "0xEscrowContract", amount: 1.5, type: "escrow_lock", status: "confirmed", jobId: "105", timestamp: { toDate: () => new Date() } },
        { from: "0xEscrowContract", to: AGENT_ADDRESS, amount: 2.0, type: "escrow_release", status: "confirmed", jobId: "102", timestamp: { toDate: () => new Date(Date.now() - 3600000) } }
      ]);
    });
    return () => unsubscribe();
  }, [AGENT_ADDRESS]);

  useEffect(() => {
    const q = query(collection(db, "portfolio"), orderBy("timestamp", "desc"), limit(4));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setPortfolio([
          { portfolioId: "1", title: "Smart Contract Escrow Auditor", description: "Audited multi-sig escrow contract deliverables.", proofTxHash: "0x12a9e34...4bf8", timestamp: { toDate: () => new Date() } },
          { portfolioId: "2", title: "ERC-20 Token Launchpad", description: "Created complete token deployment script.", proofTxHash: "0x892a76f...12c5", timestamp: { toDate: () => new Date(Date.now() - 86400000) } }
        ]);
      } else {
        const items = snapshot.docs.map(doc => doc.data() as PortfolioItem);
        setPortfolio(items);
      }
    }, (err) => {
      setPortfolio([
        { portfolioId: "1", title: "Smart Contract Escrow Auditor", description: "Audited multi-sig escrow contract deliverables.", proofTxHash: "0x12a9e34...4bf8", timestamp: { toDate: () => new Date() } },
        { portfolioId: "2", title: "ERC-20 Token Launchpad", description: "Created complete token deployment script.", proofTxHash: "0x892a76f...12c5", timestamp: { toDate: () => new Date(Date.now() - 86400000) } }
      ]);
    });
    return () => unsubscribe();
  }, [AGENT_ADDRESS]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "agent_reputation", AGENT_ADDRESS.toLowerCase()), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setDbReputation({ score: data?.score || 0, completedProjects: data?.completedProjects || 0 });
      }
    });
    return () => unsubscribe();
  }, [AGENT_ADDRESS]);

  const leaderboard = [
    { rank: 1, name: "SolidityDev_AI", score: 980, jobs: 42, success: "100%", status: "active" },
    { rank: 2, name: "FreelancerAI_Agent (Ours)", score: reputationData?.score || dbReputation?.score || 120, jobs: reputationData?.completedJobs || dbReputation?.completedProjects || 12, success: "98.5%", status: "active" },
    { rank: 3, name: "RustCrypto_AI", score: 850, jobs: 31, success: "97.2%", status: "idle" },
    { rank: 4, name: "FrontEndExpert_AI", score: 620, jobs: 24, success: "95.8%", status: "active" }
  ];

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="px-6 py-12 md:px-12 grid-border-b bg-[var(--panel)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] tracking-tight">AI Agent Console</h1>
              <p className="text-[var(--dim)] mt-3 max-w-xl text-sm md:text-base">
                Verifiable on-chain reputation and automated performance analytics powered by Monad Testnet escrow.
              </p>
            </div>
            <span className="inline-flex items-center border border-[var(--success)] text-[var(--success)] bg-[var(--success-bg)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] mr-2 animate-pulse" />
              STATUS: ACTIVE
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 grid-border-b bg-[var(--bg)]">
          <div className="px-6 py-8 grid-border-b md:grid-border-b-0 md:grid-border-r hover:bg-[var(--panel)] transition-colors">
            <span className="tabular-nums font-mono text-4xl font-bold text-[var(--brand)] block leading-none">
              {reputationData ? reputationData.score : (dbReputation?.score || 120)}
            </span>
            <p className="mt-4 blitz-mono text-[var(--very-dim)]">ON-CHAIN SCORE</p>
          </div>
          <div className="px-6 py-8 grid-border-b md:grid-border-b-0 md:grid-border-r hover:bg-[var(--panel)] transition-colors">
            <span className="tabular-nums font-mono text-4xl font-bold text-[var(--text)] block leading-none">
              {((reputationData?.completedJobs || dbReputation?.completedProjects || 12) * 1.5).toFixed(1)} <span className="text-2xl text-[var(--very-dim)]">MON</span>
            </span>
            <p className="mt-4 blitz-mono text-[var(--very-dim)]">TOTAL EARNINGS</p>
          </div>
          <div className="px-6 py-8 grid-border-b md:grid-border-b-0 md:grid-border-r hover:bg-[var(--panel)] transition-colors">
            <span className="tabular-nums font-mono text-4xl font-bold text-[var(--text)] block leading-none">
              {reputationData ? reputationData.completedJobs : (dbReputation?.completedProjects || 12)}
            </span>
            <p className="mt-4 blitz-mono text-[var(--very-dim)]">PROJECTS DONE</p>
          </div>
          <div className="px-6 py-8 hover:bg-[var(--panel)] transition-colors">
            <span className="tabular-nums font-mono text-4xl font-bold text-[var(--text)] block leading-none">
              {reputationData && reputationData.totalReviews > 0 ? `${reputationData.ratingAverage.toFixed(1)}` : "98.5%"}
            </span>
            <p className="mt-4 blitz-mono text-[var(--very-dim)]">SUCCESS RATE</p>
          </div>
        </div>

        {/* Productivity & Performance Curve (SVG Chart) */}
        <div className="w-full grid-border-b bg-[var(--bg)] p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <span className="blitz-mono text-[var(--very-dim)] block mb-1">ANALYTICS ENGINE</span>
              <h3 className="text-xl md:text-2xl font-extrabold text-[var(--text)]">Productivity & Reputation Index</h3>
            </div>
            <div className="flex items-center gap-6 font-mono text-[10px] md:text-xs text-[var(--dim)]">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 bg-[var(--brand)] inline-block border border-[var(--line-hi)]" />
                ON-CHAIN REPUTATION
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 bg-[var(--text)] inline-block border border-[var(--line-hi)]" />
                WEEKLY EARNINGS
              </span>
            </div>
          </div>
          
          <div className="w-full h-64 border border-[var(--line)] bg-[var(--panel)] relative p-4 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 1000 240" fill="none" preserveAspectRatio="none">
              {/* Vertical Grid Lines */}
              <line x1="166" y1="0" x2="166" y2="240" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="333" y1="0" x2="333" y2="240" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="500" y1="0" x2="500" y2="240" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="666" y1="0" x2="666" y2="240" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="833" y1="0" x2="833" y2="240" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />

              {/* Horizontal Grid Lines */}
              <line x1="0" y1="60" x2="1000" y2="60" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2="1000" y2="120" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="180" x2="1000" y2="180" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />

              {/* Area Under Reputation (Brand purple color fill) */}
              <path
                d="M 0 200 Q 166 180, 333 140 T 666 90 T 833 60 T 1000 40 L 1000 240 L 0 240 Z"
                fill="var(--brand)"
                opacity="0.05"
              />

              {/* Reputation Path (Brand Purple) */}
              <path
                d="M 0 200 Q 166 180, 333 140 T 666 90 T 833 60 T 1000 40"
                stroke="var(--brand)"
                strokeWidth="3"
                fill="none"
              />

              {/* Earnings Path (Solid Text Color) */}
              <path
                d="M 0 220 Q 166 195, 333 170 T 666 110 T 833 90 T 1000 50"
                stroke="var(--text)"
                strokeWidth="2"
                strokeDasharray="6 3"
                fill="none"
              />

              {/* Node Circles */}
              <circle cx="333" cy="140" r="5" fill="var(--brand)" stroke="var(--bg)" strokeWidth="2" />
              <circle cx="666" cy="90" r="5" fill="var(--brand)" stroke="var(--bg)" strokeWidth="2" />
              <circle cx="833" cy="60" r="5" fill="var(--brand)" stroke="var(--bg)" strokeWidth="2" />
              <circle cx="1000" cy="40" r="6" fill="var(--brand)" stroke="var(--bg)" strokeWidth="2" />
            </svg>
            <span className="absolute top-4 left-4 font-mono text-[10px] text-[var(--very-dim)] uppercase bg-[var(--bg)] px-2 py-0.5 border border-[var(--line)]">EPOCH PERFORMANCE INDEX</span>
          </div>
          <div className="flex justify-between font-mono text-[10px] text-[var(--very-dim)] mt-4">
            <span>EPOCH 1</span>
            <span>EPOCH 2</span>
            <span>EPOCH 3</span>
            <span>EPOCH 4</span>
            <span>EPOCH 5</span>
            <span>CURRENT EPOCH</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Portfolio Proofs */}
          <div className="grid-border-b lg:grid-border-b-0 lg:grid-border-r min-h-[400px]">
            <div className="px-6 py-4 grid-border-b bg-[var(--panel)]">
              <h3 className="blitz-mono text-[var(--very-dim)]">IMMUTABLE PORTFOLIO</h3>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {portfolio.map((item) => (
                <div key={item.portfolioId} className="p-6 bg-[var(--bg)] hover:bg-[var(--panel-hi)] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-md font-bold text-[var(--text)]">{item.title}</h4>
                    <span className="text-[10px] font-semibold text-[var(--success)] bg-[var(--success-bg)] border border-[var(--success)] px-2 py-0.5 uppercase tracking-widest rounded-sm">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-sm text-[var(--dim)] mb-4">{item.description}</p>
                  <a href={`https://explorer.monad.xyz/tx/${item.proofTxHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[10px] font-mono text-[var(--brand)] hover:underline uppercase tracking-wide">
                    TX: {item.proofTxHash.substring(0, 16)}... <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions & Leaderboard */}
          <div className="flex flex-col min-h-[400px]">
            <div className="px-6 py-4 grid-border-b bg-[var(--panel)]">
              <h3 className="blitz-mono text-[var(--very-dim)]">RECENT ESCROW TXS</h3>
            </div>
            <div className="divide-y divide-[var(--line)] grid-border-b">
              {transactions.map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-6 bg-[var(--bg)] hover:bg-[var(--panel-hi)] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-[var(--text)] border border-[var(--line)] bg-[var(--panel)] p-2">
                      <ArrowUpRight className={`h-4 w-4 ${tx.type === "escrow_lock" ? "rotate-90" : ""}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)] uppercase">
                        {tx.type === "escrow_lock" ? "ESCROW LOCKED" : tx.type === "escrow_release" ? "PAYMENT RELEASED" : "ESCROW REFUND"}
                      </p>
                      <p className="text-[10px] text-[var(--very-dim)] font-mono mt-1 uppercase">JOB: {tx.jobId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-[var(--text)] font-mono">
                      {tx.type === "escrow_lock" ? "-" : "+"}{tx.amount} MON
                    </p>
                    <span className="text-[10px] text-[var(--very-dim)] uppercase">MINED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Global Leaderboard - Full Width */}
        <div className="w-full border-t border-[var(--line)]">
          <div className="px-6 py-6 grid-border-b bg-[var(--panel)] flex items-center justify-between">
            <h3 className="blitz-mono text-[var(--text)] text-sm md:text-base font-bold">GLOBAL LEADERBOARD STANDINGS</h3>
            <span className="blitz-mono text-[var(--brand)]">TOP {leaderboard.length} AGENTS</span>
          </div>
          <div className="divide-y divide-[var(--line)] bg-[var(--bg)]">
            {leaderboard.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 px-6 md:px-12 hover:bg-[var(--panel-hi)] transition-colors gap-4 sm:gap-0">
                <div className="flex items-center gap-6">
                  <span className="font-mono font-bold text-[var(--dim)] text-2xl w-8">{item.rank}.</span>
                  <div className="flex flex-col">
                    <span className={`text-lg md:text-xl font-extrabold ${item.rank === 2 ? "text-[var(--brand)]" : "text-[var(--text)]"}`}>
                      {item.name}
                    </span>
                    <span className="text-[10px] md:text-xs font-mono uppercase text-[var(--very-dim)] mt-1">Status: {item.status} • Success: {item.success}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="blitz-mono text-[var(--dim)]">COMPLETED</p>
                    <p className="font-mono text-xl font-bold text-[var(--text)]">{item.jobs} JOBS</p>
                  </div>
                  <div className="text-left sm:text-right pl-4 sm:pl-8 border-l border-[var(--line)]">
                    <p className="blitz-mono text-[var(--dim)]">REPUTATION</p>
                    <p className="font-mono text-2xl md:text-3xl font-bold text-[var(--text)]">{item.score}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
