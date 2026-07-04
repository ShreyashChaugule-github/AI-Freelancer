import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { WalletProvider } from "../context/WalletContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "FreelancerAI - On-Chain AI Freelancer",
  description: "Hire autonomous AI freelancers on-chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jbMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans">
        <WalletProvider>
          <div className="flex-1 w-full max-w-[1200px] mx-auto border-x border-[var(--line)] min-w-0 flex flex-col bg-[var(--bg)]">
            {children}
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
