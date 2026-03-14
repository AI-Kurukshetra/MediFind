"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  DollarSign,
  LogOut,
  Package,
  Pill,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Store,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  clearPharmacySession,
  getPharmacySession,
  setPharmacySession,
  type PharmacySession,
} from "@/lib/auth/pharmacy-session";

type MedicineSummary = {
  id: string;
  name: string;
  generic_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  manufacturer: string | null;
  requires_prescription: boolean;
};

type InventoryItem = {
  id: string;
  pharmacy_id: string;
  medicine_id: string;
  quantity: number;
  unit_price: number | null;
  is_available: boolean;
  last_restocked_at: string | null;
  updated_at?: string;
  medicines?: MedicineSummary;
};

type InventoryResponse = {
  pharmacyId: string;
  includeUnavailable: boolean;
  count: number;
  results: InventoryItem[];
};

type InlineEditState = {
  quantity: string;
  unitPrice: string;
  isAvailable: boolean;
};

type PharmacyProfile = { id: string; name: string };

type MedicineOption = {
  id: string;
  name: string;
  strength: string | null;
  dosage_form: string | null;
};

type ApiErrorPayload = {
  error?: string;
  details?: string;
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 200 }}
    >
      <Card className="rounded-2xl border-slate-200/80">
        <CardContent className="p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
/* ------------------------------------------------------------------ */
function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5">
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function InventoryDashboardClient() {
  const router = useRouter();
  const { toast } = useToast();

  const [session, setSession] = useState<PharmacySession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [newMedicineId, setNewMedicineId] = useState("");
  const [selectedMedicineLabel, setSelectedMedicineLabel] = useState("");
  const [medicineQuery, setMedicineQuery] = useState("");
  const [medicineOptions, setMedicineOptions] = useState<MedicineOption[]>([]);
  const [loadingMedicineOptions, setLoadingMedicineOptions] = useState(false);
  const [creatingMedicine, setCreatingMedicine] = useState(false);
  const [newMedicineName, setNewMedicineName] = useState("");
  const [newMedicineStrength, setNewMedicineStrength] = useState("");
  const [newMedicineDosageForm, setNewMedicineDosageForm] = useState("");
  const [newMedicineManufacturer, setNewMedicineManufacturer] = useState("");
  const [newMedicineGenericName, setNewMedicineGenericName] = useState("");
  const [newMedicineRequiresPrescription, setNewMedicineRequiresPrescription] = useState(false);
  const [newQuantity, setNewQuantity] = useState("0");
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const [newIsAvailable, setNewIsAvailable] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, InlineEditState>>({});
  const [showCreateMedicine, setShowCreateMedicine] = useState(false);

  const pharmacyId = session?.pharmacy?.id ?? null;

  /* ---------- Session bootstrap ---------- */
  useEffect(() => {
    const savedSession = getPharmacySession();
    if (!savedSession?.accessToken) {
      clearPharmacySession();
      setSessionLoading(false);
      router.replace("/sign-in");
      return;
    }

    const activeSession = savedSession;

    async function bootstrapAuthState() {
      if (activeSession.pharmacy) {
        setSession(activeSession);
        setSessionLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/pharmacies/me", {
          headers: { Authorization: `Bearer ${activeSession.accessToken}` },
        });
        const payload = (await response.json()) as {
          primaryPharmacy?: PharmacyProfile | null;
          error?: string;
        };

        if (!response.ok || !payload.primaryPharmacy) {
          clearPharmacySession();
          setSession(null);
          setSessionLoading(false);
          router.replace("/sign-in");
          return;
        }

        const hydratedSession: PharmacySession = {
          ...activeSession,
          pharmacy: payload.primaryPharmacy,
        };
        setSession(hydratedSession);
        setPharmacySession(hydratedSession);
      } catch {
        clearPharmacySession();
        setSession(null);
        router.replace("/sign-in");
      } finally {
        setSessionLoading(false);
      }
    }

    void bootstrapAuthState();
  }, [router]);

  /* ---------- Fetch inventory ---------- */
  async function fetchInventory() {
    if (!pharmacyId || !session?.accessToken) {
      toast("Sign in again to load inventory.", "error");
      return;
    }

    setLoadingInventory(true);

    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/inventory?includeUnavailable=true`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const payload = (await response.json()) as InventoryResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Failed to load inventory.");
      }

      const items = (payload as InventoryResponse).results;
      setInventory(items);
      setEdits(
        items.reduce<Record<string, InlineEditState>>((acc, item) => {
          acc[item.id] = {
            quantity: String(item.quantity),
            unitPrice: item.unit_price?.toString() ?? "",
            isAvailable: item.is_available,
          };
          return acc;
        }, {})
      );
    } catch (fetchError) {
      setInventory([]);
      setEdits({});
      toast(fetchError instanceof Error ? fetchError.message : "Unexpected error while loading inventory.", "error");
    } finally {
      setLoadingInventory(false);
    }
  }

  useEffect(() => {
    if (!sessionLoading && session?.accessToken && pharmacyId) {
      void fetchInventory();
    }
  }, [sessionLoading, session?.accessToken, pharmacyId]);

  /* ---------- Helpers ---------- */
  function getApiErrorMessage(payload: unknown, fallback: string) {
    if (!payload || typeof payload !== "object") return fallback;
    const ep = payload as ApiErrorPayload;
    if (Array.isArray(ep.issues) && ep.issues.length > 0) {
      const issue = ep.issues[0];
      const field = issue.path && issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : "field";
      return `${field}: ${issue.message ?? "Invalid input."}`;
    }
    return ep.details ?? ep.error ?? fallback;
  }

  /* ---------- Medicine search ---------- */
  async function searchMedicineOptions() {
    const q = medicineQuery.trim();
    if (q.length < 2) {
      toast("Enter at least 2 characters to search.", "error");
      return;
    }

    setLoadingMedicineOptions(true);
    try {
      const response = await fetch(`/api/medicines/options?query=${encodeURIComponent(q)}`);
      const payload = (await response.json()) as { results?: MedicineOption[] } | ApiErrorPayload;
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Failed to load medicine suggestions."));

      const results = payload && typeof payload === "object" && "results" in payload ? payload.results ?? [] : [];
      setMedicineOptions(results);
      if (results.length === 0) toast("No medicines found for this query.");
    } catch (err) {
      setMedicineOptions([]);
      toast(err instanceof Error ? err.message : "Error loading medicine suggestions.", "error");
    } finally {
      setLoadingMedicineOptions(false);
    }
  }

  /* ---------- Create medicine ---------- */
  async function createMedicineOption() {
    if (!session?.accessToken) { toast("Sign in again.", "error"); return; }
    if (newMedicineName.trim().length < 2) { toast("Medicine name must be at least 2 characters.", "error"); return; }

    setCreatingMedicine(true);
    try {
      const response = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({
          name: newMedicineName,
          strength: newMedicineStrength || undefined,
          dosageForm: newMedicineDosageForm || undefined,
          manufacturer: newMedicineManufacturer || undefined,
          genericName: newMedicineGenericName || undefined,
          requiresPrescription: newMedicineRequiresPrescription,
        }),
      });
      const payload = (await response.json()) as
        | { created?: boolean; medicine?: MedicineOption & { requires_prescription?: boolean } }
        | ApiErrorPayload;

      if (!response.ok || !("medicine" in payload) || !payload.medicine) {
        throw new Error(getApiErrorMessage(payload, "Failed to create medicine."));
      }

      const medicine = payload.medicine;
      setNewMedicineId(medicine.id);
      setSelectedMedicineLabel(medicine.name);
      setMedicineQuery(medicine.name);
      setMedicineOptions([medicine]);
      setShowCreateMedicine(false);
      toast(payload.created ? `Created "${medicine.name}" and selected it.` : `"${medicine.name}" already exists and is selected.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error creating medicine.", "error");
    } finally {
      setCreatingMedicine(false);
    }
  }

  /* ---------- Create inventory item ---------- */
  async function createInventoryItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pharmacyId || !session?.accessToken) { toast("Sign in again to add inventory.", "error"); return; }
    if (!newMedicineId) { toast("Select or create a medicine first.", "error"); return; }

    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({
          medicineId: newMedicineId,
          quantity: Number(newQuantity),
          unitPrice: newUnitPrice ? Number(newUnitPrice) : null,
          isAvailable: newIsAvailable,
        }),
      });
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Failed to add inventory item."));

      setNewMedicineId("");
      setSelectedMedicineLabel("");
      setMedicineQuery("");
      setMedicineOptions([]);
      setNewMedicineName("");
      setNewMedicineStrength("");
      setNewMedicineDosageForm("");
      setNewMedicineManufacturer("");
      setNewMedicineGenericName("");
      setNewMedicineRequiresPrescription(false);
      setNewQuantity("0");
      setNewUnitPrice("");
      setNewIsAvailable(true);
      toast("Inventory item added successfully!");
      await fetchInventory();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error adding inventory.", "error");
    }
  }

  /* ---------- Update inventory item ---------- */
  async function updateInventoryItem(inventoryId: string) {
    if (!pharmacyId || !session?.accessToken) { toast("Sign in again.", "error"); return; }
    const edit = edits[inventoryId];
    if (!edit) { toast("No edit data found.", "error"); return; }

    setUpdatingId(inventoryId);
    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/inventory/${inventoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({
          quantity: Number(edit.quantity),
          unitPrice: edit.unitPrice ? Number(edit.unitPrice) : null,
          isAvailable: edit.isAvailable,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to update inventory item.");

      toast("Inventory updated!");
      await fetchInventory();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error updating inventory.", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ---------- Sign out ---------- */
  async function signOut() {
    if (session?.accessToken) {
      try {
        await fetch("/api/auth/sign-out", { method: "POST", headers: { Authorization: `Bearer ${session.accessToken}` } });
      } catch { /* ignore */ }
    }
    clearPharmacySession();
    setSession(null);
    router.replace("/sign-in");
  }

  const availableCount = useMemo(() => inventory.filter((i) => i.is_available).length, [inventory]);
  const unavailableCount = inventory.length - availableCount;

  /* ---------- Session loading ---------- */
  if (sessionLoading) {
    return (
      <main className="saas-page space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </main>
    );
  }

  /* ---------- No session ---------- */
  if (!session || !pharmacyId) {
    return (
      <main className="saas-page flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-2xl text-center">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
              <Store className="h-7 w-7 text-amber-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Pharmacy account required</h2>
              <p className="text-sm text-slate-500">
                Sign in with a pharmacy owner account to manage your inventory.
              </p>
            </div>
            <Link href="/sign-in">
              <Button className="mt-2 gap-2 bg-brand text-white hover:bg-brand/90">
                <LogOut className="h-4 w-4" />
                Go to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  /* ---------- Main dashboard ---------- */
  return (
    <>
      {/* Dashboard header */}
      <section className="border-b border-slate-200/60 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
              <Store className="h-6 w-6 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{session.pharmacy?.name}</h1>
              <p className="text-sm text-slate-500">Pharmacy Inventory Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void fetchInventory()}
              disabled={loadingInventory}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingInventory && "animate-spin")} />
              {loadingInventory ? "Syncing..." : "Refresh"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-slate-500" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </section>

      <main className="saas-page space-y-8 pt-10">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Package} label="Total Items" value={inventory.length} color="bg-brand/10 text-brand" />
          <StatCard icon={CheckCircle2} label="Available" value={availableCount} color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={XCircle} label="Unavailable" value={unavailableCount} color="bg-red-50 text-red-500" />
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          {/* Left column: Add inventory */}
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200/80">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4 text-brand" />
                  Add Inventory Item
                </CardTitle>
                <CardDescription>Search for or create a medicine, then add stock to your pharmacy.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createInventoryItem} className="space-y-5">
                  {/* Selected medicine display */}
                  {selectedMedicineLabel ? (
                    <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
                      <Pill className="h-5 w-5 text-brand" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{selectedMedicineLabel}</p>
                        <p className="truncate text-xs text-slate-500">Selected for inventory</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setNewMedicineId(""); setSelectedMedicineLabel(""); }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <input type="hidden" name="medicineId" value={newMedicineId} />
                  )}

                  {/* Medicine search */}
                  {!selectedMedicineLabel && (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Find existing medicine
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            value={medicineQuery}
                            onChange={(e) => setMedicineQuery(e.target.value)}
                            placeholder="Search e.g. Paracetamol"
                            className="h-10 pl-10 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-10 gap-1.5 bg-brand text-white hover:bg-brand/90"
                          onClick={() => void searchMedicineOptions()}
                          disabled={loadingMedicineOptions}
                        >
                          <Search className="h-3.5 w-3.5" />
                          {loadingMedicineOptions ? "..." : "Search"}
                        </Button>
                      </div>

                      <AnimatePresence>
                        {medicineOptions.length > 0 && (
                          <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-1.5 overflow-hidden"
                          >
                            {medicineOptions.map((opt) => (
                              <li key={opt.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewMedicineId(opt.id);
                                    setSelectedMedicineLabel(opt.name);
                                    toast(`Selected "${opt.name}"`);
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-brand/30 hover:bg-brand/5"
                                >
                                  <Pill className="h-4 w-4 shrink-0 text-slate-400" />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-sm font-medium text-slate-900">{opt.name}</span>
                                    {(opt.strength || opt.dosage_form) && (
                                      <span className="ml-2 text-xs text-slate-500">
                                        {opt.strength} {opt.dosage_form}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Create new medicine */}
                  {!selectedMedicineLabel && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateMedicine((v) => !v)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-brand" />
                          <span className="text-sm font-medium text-slate-700">Medicine not listed? Create new</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", showCreateMedicine && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {showCreateMedicine && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <Input
                                value={newMedicineName}
                                onChange={(e) => setNewMedicineName(e.target.value)}
                                placeholder="Medicine name *"
                                className="h-10 text-sm sm:col-span-2"
                              />
                              <Input
                                value={newMedicineStrength}
                                onChange={(e) => setNewMedicineStrength(e.target.value)}
                                placeholder="Strength (e.g. 500 mg)"
                                className="h-10 text-sm"
                              />
                              <Input
                                value={newMedicineDosageForm}
                                onChange={(e) => setNewMedicineDosageForm(e.target.value)}
                                placeholder="Dosage form (tablet/syrup)"
                                className="h-10 text-sm"
                              />
                              <Input
                                value={newMedicineManufacturer}
                                onChange={(e) => setNewMedicineManufacturer(e.target.value)}
                                placeholder="Manufacturer"
                                className="h-10 text-sm"
                              />
                              <Input
                                value={newMedicineGenericName}
                                onChange={(e) => setNewMedicineGenericName(e.target.value)}
                                placeholder="Generic name"
                                className="h-10 text-sm"
                              />
                              <div className="sm:col-span-2">
                                <Toggle
                                  checked={newMedicineRequiresPrescription}
                                  onChange={setNewMedicineRequiresPrescription}
                                  label="Requires prescription"
                                  id="new-rx"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="mt-3 gap-1.5 bg-brand text-white hover:bg-brand/90"
                              onClick={() => void createMedicineOption()}
                              disabled={creatingMedicine}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {creatingMedicine ? "Creating..." : "Create & Select"}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Stock fields */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-quantity" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Quantity
                      </Label>
                      <div className="relative">
                        <Box className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="new-quantity"
                          required
                          inputMode="numeric"
                          value={newQuantity}
                          onChange={(e) => setNewQuantity(e.target.value)}
                          className="h-10 pl-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-unit-price" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Unit Price
                      </Label>
                      <div className="relative">
                        <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="new-unit-price"
                          inputMode="decimal"
                          value={newUnitPrice}
                          onChange={(e) => setNewUnitPrice(e.target.value)}
                          placeholder="Optional"
                          className="h-10 pl-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-end pb-1">
                      <Toggle checked={newIsAvailable} onChange={setNewIsAvailable} label="Available" id="new-avail" />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2 bg-brand text-white hover:bg-brand/90">
                    <Plus className="h-4 w-4" />
                    Add to Inventory
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Inventory list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ClipboardList className="h-5 w-5 text-brand" />
                Current Inventory
              </h2>
              <Badge variant="secondary">{inventory.length} item{inventory.length !== 1 ? "s" : ""}</Badge>
            </div>

            {loadingInventory ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : inventory.length === 0 ? (
              <Card className="rounded-2xl border-dashed border-slate-300 bg-slate-50/50">
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Package className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">No inventory items yet</p>
                  <p className="max-w-xs text-xs text-slate-500">
                    Use the form on the left to add medicines to your pharmacy inventory.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <motion.ul
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                className="space-y-3"
              >
                {inventory.map((item) => {
                  const edit = edits[item.id] ?? {
                    quantity: String(item.quantity),
                    unitPrice: item.unit_price?.toString() ?? "",
                    isAvailable: item.is_available,
                  };
                  const isUpdating = updatingId === item.id;

                  return (
                    <motion.li
                      key={item.id}
                      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                      transition={{ type: "spring", damping: 20, stiffness: 200 }}
                    >
                      <Card className="card-hover rounded-2xl border-slate-200/80">
                        <CardContent className="p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                edit.isAvailable ? "bg-brand/10 text-brand" : "bg-red-50 text-red-400"
                              )}>
                                <Pill className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900">
                                  {item.medicines?.name ?? "Unknown Medicine"}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  {item.medicines?.strength && <span>{item.medicines.strength}</span>}
                                  {item.medicines?.dosage_form && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span>{item.medicines.dosage_form}</span>
                                    </>
                                  )}
                                  {item.medicines?.requires_prescription && (
                                    <Badge variant="warning" className="gap-1 text-[10px]">
                                      <ShieldCheck className="h-3 w-3" />
                                      Rx
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={edit.isAvailable ? "success" : "secondary"}
                              className="shrink-0"
                            >
                              {edit.isAvailable ? "Available" : "Unavailable"}
                            </Badge>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-4">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Qty</Label>
                              <Input
                                inputMode="numeric"
                                value={edit.quantity}
                                onChange={(e) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [item.id]: { ...edit, quantity: e.target.value },
                                  }))
                                }
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Price</Label>
                              <Input
                                inputMode="decimal"
                                value={edit.unitPrice}
                                placeholder="—"
                                onChange={(e) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [item.id]: { ...edit, unitPrice: e.target.value },
                                  }))
                                }
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="flex items-end pb-0.5">
                              <Toggle
                                checked={edit.isAvailable}
                                onChange={(v) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [item.id]: { ...edit, isAvailable: v },
                                  }))
                                }
                                label="Available"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                size="sm"
                                className="w-full gap-1.5 bg-brand text-white hover:bg-brand/90"
                                onClick={() => void updateInventoryItem(item.id)}
                                disabled={isUpdating}
                              >
                                <Save className="h-3.5 w-3.5" />
                                {isUpdating ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
