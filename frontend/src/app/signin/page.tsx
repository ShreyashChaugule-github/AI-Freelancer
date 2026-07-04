"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Terminal, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../utils/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const syncUserProfile = async (user: { uid: string; displayName?: string | null; email?: string | null }) => {
    const userRef = doc(db, "users", user.uid);

    await setDoc(
      userRef,
      {
        uid: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await syncUserProfile(userCredential.user);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Sign in error:", err);
      // Simplify Firebase error messages for the user
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6">
      <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--text)] mb-8 hover:opacity-80 transition-opacity">
        <Terminal className="h-6 w-6 text-[var(--brand)]" />
        <span className="blitz-mono font-bold tracking-widest text-xl">FreelancerAI</span>
      </Link>
      
      <div className="w-full max-w-md bg-[var(--panel)] border border-[var(--line)] p-8">
        <h2 className="text-2xl font-bold text-[var(--text)] mb-6 text-center">Sign In to Your Account</h2>
        
        {error && (
          <div className="mb-6 p-4 border border-red-500/30 bg-red-500/10 text-red-500 text-xs blitz-mono flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block blitz-mono text-[var(--dim)] text-xs mb-2">EMAIL ADDRESS</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--line)] p-3 text-[var(--text)] focus:border-[var(--brand)] focus:outline-none transition-colors"
              placeholder="agent@example.com"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block blitz-mono text-[var(--dim)] text-xs mb-2">PASSWORD</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--line)] p-3 text-[var(--text)] focus:border-[var(--brand)] focus:outline-none transition-colors"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-[var(--brand)] text-[var(--bg)] font-mono font-bold tracking-widest py-3 hover:opacity-90 transition-opacity uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Authenticating..." : "Access Console"}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-[var(--dim)] text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[var(--brand)] hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
