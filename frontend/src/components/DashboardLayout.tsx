"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletContext } from "../context/WalletContext";
import { Menu, X, Terminal, AlertTriangle } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { 
    address, 
    isConnected, 
    isCorrectNetwork, 
    isConnecting, 
    connectWallet, 
    switchNetwork 
  } = useWalletContext();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Workspace", href: "/projects" },
  ];

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] w-full">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-[var(--bg)] grid-border-b">
        <div className="flex h-14 w-full items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--text)] hover:text-[var(--dim)] transition-colors">
              <Terminal className="h-5 w-5 text-[var(--brand)]" />
              <span className="blitz-mono font-bold tracking-widest text-[var(--text)]">FreelancerAI</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`blitz-mono transition-colors whitespace-nowrap ${
                      isActive ? "text-[var(--text)] font-bold" : "text-[var(--dim)] hover:text-[var(--text)]"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop Wallet Widget */}
            <div className="hidden md:flex items-center gap-3">
              {isConnected ? (
                <>
                  {!isCorrectNetwork ? (
                    <button
                      onClick={switchNetwork}
                      className="inline-flex items-center justify-center whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.06em] transition-colors duration-200 border h-8 px-3 border-[var(--line)] text-amber-600 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      Switch Network
                    </button>
                  ) : (
                    <div className="inline-flex items-center justify-center whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.06em] border h-8 px-3 border-[var(--line)] text-[var(--text)] bg-[var(--panel)]">
                      Monad Testnet
                    </div>
                  )}
                  <div className="inline-flex items-center justify-center whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.06em] border h-8 px-3 border-[var(--brand)] text-[var(--bg)] bg-[var(--brand)] cursor-default">
                    {address && formatAddress(address)}
                  </div>
                </>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="inline-flex items-center justify-center whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.06em] transition-colors duration-200 border h-8 px-4 border-[var(--brand)] text-[var(--bg)] bg-[var(--brand)] hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? "Connecting..." : "CONNECT WALLET"}
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -mr-2 text-[var(--dim)] md:hidden hover:text-[var(--text)]"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[var(--bg)] grid-border-b py-4 px-6 space-y-4 z-40 absolute top-14 left-0 right-0 shadow-lg">
          <nav className="flex flex-col space-y-3">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`blitz-mono ${
                    isActive ? "text-[var(--text)] font-bold" : "text-[var(--dim)]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          <div className="pt-4 grid-border-t flex flex-col gap-2">
            {isConnected ? (
              <>
                {!isCorrectNetwork && (
                  <button
                    onClick={() => { switchNetwork(); setIsMobileMenuOpen(false); }}
                    className="w-full text-left blitz-mono text-amber-600 py-2"
                  >
                    SWITCH TO MONAD
                  </button>
                )}
                <div className="blitz-mono text-[var(--text)] py-2">
                  {address && formatAddress(address)}
                </div>
              </>
            ) : (
              <button
                onClick={() => { connectWallet(); setIsMobileMenuOpen(false); }}
                className="w-full blitz-mono bg-[var(--brand)] text-white py-3 text-center"
              >
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
