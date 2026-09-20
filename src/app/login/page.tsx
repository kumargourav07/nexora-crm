"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/auth-actions";
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFillDemo = () => {
    setEmail("demo@nexora.local");
    setPassword("Nexora@2026");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    startTransition(async () => {
      const res = await loginAction({ email, password });
      if (!res.success) {
        setError(res.error || "Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90 mb-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <span className="text-base font-black font-mono">◈</span>
          </div>
          <span className="text-2xl font-extrabold tracking-wider">
            NEXORA
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Sign in to your CRM
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Access your multi-tenant sales pipeline &amp; enterprise database
        </p>
      </div>

      {/* Demo Fill Quick Banner */}
      <div className="mb-4 p-3.5 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-foreground font-medium">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>Local Demo Account ready</span>
        </div>
        <button
          type="button"
          onClick={handleFillDemo}
          className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all"
        >
          Fill Demo Login
        </button>
      </div>

      {/* Login Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@nexora.local"
                className="w-full h-10 rounded-xl border border-border bg-background pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-foreground"
              >
                Password
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                Demo: Nexora@2026
              </span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 rounded-xl border border-border bg-background pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-10 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div className="mt-6 pt-5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>Don&apos;t have a workspace?</span>
          <Link
            href="/signup"
            className="text-primary font-semibold hover:underline"
          >
            Create Workspace
          </Link>
        </div>
      </div>

      {/* Security / Alternative link */}
      <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Workspace Isolated &amp; End-to-End Encrypted Session</span>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Link href="/demo" className="hover:text-foreground underline">
            Explore Public Interactive Demo
          </Link>
          <span>•</span>
          <Link href="/" className="hover:text-foreground">
            Return to Website
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense fallback={<div className="text-xs text-muted-foreground">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
