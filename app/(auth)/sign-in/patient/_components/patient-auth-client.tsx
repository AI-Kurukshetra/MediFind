"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { supabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

type SessionPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

type UserPayload = { id: string; email?: string | null };

type ApiError = {
  error?: string;
  details?: string;
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

function FormField({
  label,
  htmlFor,
  icon: Icon,
  children,
}: {
  label: string;
  htmlFor?: string;
  icon?: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-slate-600">
        {label}
      </Label>
      {Icon ? (
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function PatientAuthClient() {
  const params = useSearchParams();
  const { toast } = useToast();
  const redirectParam = params.get("redirect");

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const headingCopy = useMemo(() => {
    if (mode === "sign-up") {
      return {
        title: "Create your account",
        subtitle: "Track deliveries and reservations in one place.",
      };
    }
    return {
      title: "Welcome back",
      subtitle: "Sign in to access your orders and delivery updates.",
    };
  }, [mode]);

  function getErrorMessage(payload: unknown, fallback: string) {
    if (payload && typeof payload === "object" && "error" in payload) {
      const ep = payload as ApiError;
      if (Array.isArray(ep.issues) && ep.issues.length > 0) {
        const issue = ep.issues[0];
        const field = issue.path && issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : "field";
        return `${field}: ${issue.message ?? "Invalid input."}`;
      }
      return ep.details ?? ep.error ?? fallback;
    }
    return fallback;
  }

  async function persistAndRedirect(session: SessionPayload) {
    await supabaseBrowserClient.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken ?? "",
    });
    const target = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/search";
    window.location.href = target;
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as {
        user?: UserPayload;
        session?: SessionPayload;
        error?: string;
        details?: string;
      };

      if (!response.ok || !payload.session || !payload.user) {
        throw new Error(getErrorMessage(payload, "Unable to sign in."));
      }

      toast("Signed in! Redirecting...");
      await persistAndRedirect(payload.session);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unexpected error while signing in.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone: phone || undefined,
          role: "patient",
        }),
      });

      const payload = (await response.json()) as {
        needsEmailVerification?: boolean;
        session?: SessionPayload | null;
        user?: UserPayload | null;
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to create account."));
      }

      if (payload.needsEmailVerification || !payload.session || !payload.user) {
        toast("Account created! Verify your email, then sign in.");
        setMode("sign-in");
        return;
      }

      toast("Account created! Redirecting...");
      await persistAndRedirect(payload.session);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unexpected error while creating account.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{headingCopy.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{headingCopy.subtitle}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode("sign-in")}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-all",
            mode === "sign-in" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("sign-up")}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-all",
            mode === "sign-up" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Create Account
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "sign-in" ? (
          <motion.form
            key="sign-in"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSignIn}
            className="space-y-4"
          >
            <FormField label="Email address" htmlFor="patient-email" icon={Mail}>
              <Input
                id="patient-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 pl-10"
              />
            </FormField>

            <FormField label="Password" htmlFor="patient-password" icon={Lock}>
              <Input
                id="patient-password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 pl-10 pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </FormField>

            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full gap-2 bg-brand text-white hover:bg-brand/90"
            >
              {busy ? "Signing in..." : "Sign in"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="sign-up"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSignUp}
            className="space-y-4"
          >
            <FormField label="Full name" htmlFor="patient-fullname" icon={User}>
              <Input
                id="patient-fullname"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="h-11 pl-10"
              />
            </FormField>

            <FormField label="Email address" htmlFor="patient-email-signup" icon={Mail}>
              <Input
                id="patient-email-signup"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 pl-10"
              />
            </FormField>

            <FormField label="Password" htmlFor="patient-password-signup" icon={Lock}>
              <Input
                id="patient-password-signup"
                required
                type={showPassword ? "text" : "password"}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="h-11 pl-10 pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </FormField>

            <FormField label="Phone (optional)" htmlFor="patient-phone">
              <Input
                id="patient-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-11"
              />
            </FormField>

            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full gap-2 bg-brand text-white hover:bg-brand/90"
            >
              {busy ? "Creating..." : "Create account"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-center text-sm text-slate-500">
          Pharmacy owner?{" "}
          <Link href="/sign-in" className="font-medium text-brand hover:text-brand/80">
            Sign in to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
