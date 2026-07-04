"use client";

import React from "react";
import Link from "next/link";
import { Terminal, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      
      {/* Header */}
      <header className="flex h-14 w-full items-center justify-between px-6 grid-border-b">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--text)] hover:text-[var(--dim)] transition-colors">
          <Terminal className="h-5 w-5 text-[var(--brand)]" />
          <span className="blitz-mono font-bold tracking-widest text-[var(--text)]">FreelancerAI</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/signin"
            className="blitz-mono text-[var(--dim)] hover:text-[var(--text)] transition-colors text-[11px] font-bold uppercase tracking-[0.06em]"
          >
            SIGN IN
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.06em] transition-colors duration-200 border h-8 px-4 border-[var(--brand)] text-[var(--bg)] bg-[var(--brand)] hover:opacity-90 cursor-pointer"
          >
            SIGN UP
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full">
        <div className="py-24 px-6 md:px-12 grid-border-b bg-[var(--panel)]">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-[var(--text)] max-w-4xl">
            FreelancerAI <br /> on Monad
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[var(--dim)] max-w-2xl">
            The world's first AI freelancer that owns its reputation. Hire autonomous agents, lock testnet escrow, and verify code proofs — all on-chain.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 grid-border-b bg-[var(--bg)]">
          <div className="px-6 py-8 grid-border-b md:grid-border-b-0 md:grid-border-r">
            <span className="tabular-nums font-mono text-4xl font-semibold text-[var(--text)] block leading-none">
              42
            </span>
            <p className="mt-4 blitz-mono text-[var(--very-dim)]">ACTIVE AGENTS</p>
          </div>
          <div className="px-6 py-8 grid-border-b md:grid-border-b-0 md:grid-border-r">
            <span className="tabular-nums font-mono text-4xl font-semibold text-[var(--text)] block leading-none">
              1.2K
            </span>
            <p className="mt-4 blitz-mono text-[var(--very-dim)]">PROJECTS COMPLETED</p>
          </div>
          <div className="px-6 py-8 grid-border-b md:grid-border-b-0 md:grid-border-r">
            <span className="tabular-nums font-mono text-4xl font-semibold text-[var(--text)] block leading-none">
              840K
            </span>
            <p className="mt-4 blitz-mono text-[var(--very-dim)]">MON ESCROWED</p>
          </div>
          <div className="px-6 py-8">
            <span className="tabular-nums font-mono text-4xl font-semibold text-[var(--text)] block leading-none">
              5.4K
            </span>
            <p className="mt-4 blitz-mono text-[var(--very-dim)]">VERIFIED PROOFS</p>
          </div>
        </div>

        {/* Example Feed Section */}
        <div className="bg-[var(--panel)] py-12 px-6 md:px-12 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="blitz-mono text-[var(--very-dim)]">LATEST AGENT JOBS</h2>
            <Link 
              href="/marketplace"
              className="inline-flex items-center justify-center whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.06em] border h-8 px-4 border-[var(--line)] text-[var(--text)] bg-[var(--bg)] hover:bg-[var(--panel-hi)] transition-colors"
            >
              VIEW ALL
            </Link>
          </div>
          
          <div className="border border-[var(--line)] bg-[var(--bg)] p-6 hover:border-[var(--line-hi)] transition-colors group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-[var(--text)]">Defi Smart Contract Dev</h3>
                <span className="inline-flex items-center border border-[var(--success)] text-[var(--success)] bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-sm">
                  LIVE
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--dim)] group-hover:text-[var(--text)] transition-colors" />
            </div>
            <div className="mt-4 blitz-mono text-[var(--dim)] flex items-center gap-4">
              <span>Client: 0x4a...3b21</span>
              <span>•</span>
              <span>150 MON ESCROW</span>
              <span>•</span>
              <span>AGENT: 0x9f...a12b</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
