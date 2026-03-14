"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  Locate,
  Lock,
  Mail,
  MapPin,
  Phone,
  Search,
  Store,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { setPharmacySession } from "@/lib/auth/pharmacy-session";

type AuthMode = "sign-in" | "register";

type SessionPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

type UserPayload = { id: string; email?: string };
type PharmacySummary = { id: string; name: string };

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

export function PharmacyAuthClient() {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [busy, setBusy] = useState(false);
  const [pendingOwnerSession, setPendingOwnerSession] = useState<{
    session: SessionPayload;
    user: UserPayload;
  } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showPharmacyDetails, setShowPharmacyDetails] = useState(true);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("IN");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [pharmacyPhone, setPharmacyPhone] = useState("");

  const headingCopy = useMemo(() => {
    if (mode === "register") {
      return {
        title: "Create your pharmacy",
        subtitle: "Set up your account and start managing inventory in minutes.",
      };
    }
    return {
      title: "Welcome back",
      subtitle: "Sign in to access your pharmacy dashboard.",
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

  async function fetchPrimaryPharmacy(accessToken: string) {
    const response = await fetch("/api/pharmacies/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json()) as {
      primaryPharmacy?: PharmacySummary | null;
      error?: string;
      details?: string;
    };
    if (!response.ok) throw new Error(getErrorMessage(payload, "Failed to load pharmacy profile."));
    return payload.primaryPharmacy ?? null;
  }

  function persistSession(session: SessionPayload, user: UserPayload, pharmacy: PharmacySummary) {
    setPharmacySession({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      user: { id: user.id, email: user.email },
      pharmacy,
    });
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      toast("Geolocation not supported by your browser.", "error");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setDetectingLocation(false);
        toast("Pharmacy location detected!");
      },
      () => {
        setDetectingLocation(false);
        toast("Unable to detect location. Enter manually.", "error");
      }
    );
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      });
      const payload = (await res.json()) as {
        user?: UserPayload;
        session?: SessionPayload;
        error?: string;
        details?: string;
      };

      if (!res.ok || !payload.session || !payload.user) {
        throw new Error(getErrorMessage(payload, "Unable to sign in."));
      }

      const primaryPharmacy = await fetchPrimaryPharmacy(payload.session.accessToken);

      if (!primaryPharmacy) {
        setPendingOwnerSession({ session: payload.session, user: payload.user });
        setMode("register");
        toast("No pharmacy linked yet. Complete your pharmacy profile below.");
        return;
      }

      persistSession(payload.session, payload.user, primaryPharmacy);
      toast("Sign-in successful! Opening dashboard...");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unexpected error while signing in.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      let activeSession: SessionPayload;
      let activeUser: UserPayload;

      if (pendingOwnerSession) {
        activeSession = pendingOwnerSession.session;
        activeUser = pendingOwnerSession.user;
      } else {
        const res = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: registerEmail,
            password: registerPassword,
            fullName: registerFullName,
            phone: registerPhone || undefined,
            role: "pharmacy_owner",
          }),
        });
        const payload = (await res.json()) as {
          user?: UserPayload | null;
          session?: SessionPayload | null;
          needsEmailVerification?: boolean;
          error?: string;
          details?: string;
        };

        if (!res.ok) throw new Error(getErrorMessage(payload, "Unable to create account."));

        if (payload.needsEmailVerification || !payload.session || !payload.user) {
          toast("Account created! Verify your email, then sign in.");
          setMode("sign-in");
          setBusy(false);
          return;
        }

        activeSession = payload.session;
        activeUser = payload.user;
      }

      const registerRes = await fetch("/api/pharmacies/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeSession.accessToken}`,
        },
        body: JSON.stringify({
          name: pharmacyName,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          state: stateName,
          postalCode,
          country,
          latitude: Number(latitude),
          longitude: Number(longitude),
          contactPhone: pharmacyPhone || undefined,
        }),
      });

      const registerPayload = (await registerRes.json()) as {
        pharmacy?: PharmacySummary;
        error?: string;
        details?: string;
      };

      if (registerRes.status === 409 && registerPayload.pharmacy) {
        persistSession(activeSession, activeUser, registerPayload.pharmacy);
        setPendingOwnerSession(null);
        toast("Pharmacy already linked. Opening dashboard...");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (!registerRes.ok || !registerPayload.pharmacy) {
        throw new Error(getErrorMessage(registerPayload, "Unable to register pharmacy."));
      }

      persistSession(activeSession, activeUser, registerPayload.pharmacy);
      setPendingOwnerSession(null);
      toast("Pharmacy created! Opening dashboard...");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unexpected error while creating pharmacy.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{headingCopy.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{headingCopy.subtitle}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => { setMode("sign-in"); setPendingOwnerSession(null); }}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-all",
            mode === "sign-in"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-all",
            mode === "register"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Register
        </button>
      </div>

      {/* Forms */}
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
            <FormField label="Email address" htmlFor="si-email" icon={Mail}>
              <Input
                id="si-email"
                required
                type="email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="owner@pharmacy.com"
                className="h-11 pl-10"
              />
            </FormField>

            <FormField label="Password" htmlFor="si-password" icon={Lock}>
              <Input
                id="si-password"
                required
                type={showPassword ? "text" : "password"}
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
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
              {busy ? "Signing in..." : "Sign in to Dashboard"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleRegister}
            className="space-y-5"
          >
            {/* Owner account fields */}
            {pendingOwnerSession ? (
              <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
                <Mail className="h-4 w-4 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {pendingOwnerSession.user.email ?? "Signed in"}
                  </p>
                  <p className="text-xs text-slate-500">Complete your pharmacy profile below</p>
                </div>
                <Badge variant="success" className="text-[10px]">Authenticated</Badge>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Owner Account
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Full Name" htmlFor="reg-name" icon={User}>
                    <Input
                      id="reg-name"
                      required
                      value={registerFullName}
                      onChange={(e) => setRegisterFullName(e.target.value)}
                      placeholder="John Doe"
                      className="h-10 pl-10"
                    />
                  </FormField>
                  <FormField label="Phone (optional)" htmlFor="reg-phone" icon={Phone}>
                    <Input
                      id="reg-phone"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-10 pl-10"
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Email" htmlFor="reg-email" icon={Mail}>
                    <Input
                      id="reg-email"
                      required
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="h-10 pl-10"
                    />
                  </FormField>
                  <FormField label="Password" htmlFor="reg-password" icon={Lock}>
                    <Input
                      id="reg-password"
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={8}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="h-10 pl-10 pr-10"
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
                </div>
              </div>
            )}

            {/* Pharmacy profile */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowPharmacyDetails((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <Store className="h-4 w-4 text-brand" />
                  <span className="text-sm font-semibold text-slate-900">Pharmacy Details</span>
                </div>
                <ChevronDown
                  className={cn("h-4 w-4 text-slate-400 transition", showPharmacyDetails && "rotate-180")}
                />
              </button>

              <AnimatePresence>
                {showPharmacyDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3">
                      <FormField label="Pharmacy Name" htmlFor="ph-name" icon={Building2}>
                        <Input
                          id="ph-name"
                          required
                          value={pharmacyName}
                          onChange={(e) => setPharmacyName(e.target.value)}
                          placeholder="MediCare Pharmacy"
                          className="h-10 pl-10"
                        />
                      </FormField>

                      <FormField label="Address Line 1" htmlFor="ph-addr1" icon={MapPin}>
                        <Input
                          id="ph-addr1"
                          required
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          placeholder="123 Main Street"
                          className="h-10 pl-10"
                        />
                      </FormField>

                      <FormField label="Address Line 2 (optional)" htmlFor="ph-addr2">
                        <Input
                          id="ph-addr2"
                          value={addressLine2}
                          onChange={(e) => setAddressLine2(e.target.value)}
                          placeholder="Floor, suite, building"
                          className="h-10"
                        />
                      </FormField>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="City" htmlFor="ph-city">
                          <Input
                            id="ph-city"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="New Delhi"
                            className="h-10"
                          />
                        </FormField>
                        <FormField label="State" htmlFor="ph-state">
                          <Input
                            id="ph-state"
                            required
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
                            placeholder="Delhi"
                            className="h-10"
                          />
                        </FormField>
                        <FormField label="Postal Code" htmlFor="ph-zip">
                          <Input
                            id="ph-zip"
                            required
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="110001"
                            className="h-10"
                          />
                        </FormField>
                        <FormField label="Country (ISO)" htmlFor="ph-country">
                          <Input
                            id="ph-country"
                            required
                            value={country}
                            onChange={(e) => setCountry(e.target.value.toUpperCase())}
                            placeholder="IN"
                            className="h-10"
                          />
                        </FormField>
                      </div>

                      {/* Location with detect button */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-slate-600">Pharmacy Location</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-brand hover:text-brand"
                            onClick={detectLocation}
                            disabled={detectingLocation}
                          >
                            <Locate className={cn("h-3.5 w-3.5", detectingLocation && "animate-pulse")} />
                            {detectingLocation ? "Detecting..." : "Detect location"}
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            required
                            type="number"
                            step="any"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            placeholder="Latitude"
                            className="h-10"
                          />
                          <Input
                            required
                            type="number"
                            step="any"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            placeholder="Longitude"
                            className="h-10"
                          />
                        </div>
                        {latitude && longitude && (
                          <Badge variant="success" className="gap-1 text-[10px]">
                            <MapPin className="h-3 w-3" />
                            {latitude}, {longitude}
                          </Badge>
                        )}
                      </div>

                      <FormField label="Contact Phone (optional)" htmlFor="ph-phone" icon={Phone}>
                        <Input
                          id="ph-phone"
                          value={pharmacyPhone}
                          onChange={(e) => setPharmacyPhone(e.target.value)}
                          placeholder="+91 11 2345 6789"
                          className="h-10 pl-10"
                        />
                      </FormField>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full gap-2 bg-brand text-white hover:bg-brand/90"
            >
              {busy ? "Creating account..." : "Create Account & Open Dashboard"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Footer link */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-center text-sm text-slate-500">
          Looking for medicines?{" "}
          <Link href="/search" className="inline-flex items-center gap-1 font-medium text-brand hover:text-brand/80">
            <Search className="h-3.5 w-3.5" />
            Search nearby pharmacies
          </Link>
        </p>
      </div>
    </div>
  );
}
