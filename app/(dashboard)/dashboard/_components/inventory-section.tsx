"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  ChevronDown,
  DollarSign,
  Pill,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getPharmacySession } from "@/lib/auth/pharmacy-session";

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

type MedicineOption = { id: string; name: string; strength: string | null; dosage_form: string | null };

type InlineEditState = { quantity: string; unitPrice: string; isAvailable: boolean };

function Toggle({
  checked,
  onChange,
  label,
  id,
}: { checked: boolean; onChange: (v: boolean) => void; label?: string; id?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2">
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand" : "bg-slate-300"
        )}
      >
        <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-1")} />
      </button>
      {label ? <span className="text-xs text-slate-600">{label}</span> : null}
    </label>
  );
}

export function InventorySection() {
  const { toast } = useToast();
  const session = getPharmacySession();
  const pharmacyId = session?.pharmacy?.id ?? null;
  const token = session?.accessToken ?? null;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedicineId, setNewMedicineId] = useState("");
  const [selectedMedicineLabel, setSelectedMedicineLabel] = useState("");
  const [medicineQuery, setMedicineQuery] = useState("");
  const [medicineOptions, setMedicineOptions] = useState<MedicineOption[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMedicineName, setNewMedicineName] = useState("");
  const [newMedicineStrength, setNewMedicineStrength] = useState("");
  const [newMedicineDosageForm, setNewMedicineDosageForm] = useState("");
  const [newMedicineManufacturer, setNewMedicineManufacturer] = useState("");
  const [newMedicineGenericName, setNewMedicineGenericName] = useState("");
  const [newMedicineRequiresPrescription, setNewMedicineRequiresPrescription] = useState(false);
  const [newQuantity, setNewQuantity] = useState("0");
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const [newIsAvailable, setNewIsAvailable] = useState(true);
  const [showCreateMedicine, setShowCreateMedicine] = useState(false);
  const [edits, setEdits] = useState<Record<string, InlineEditState>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchInventory() {
    if (!pharmacyId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacies/${pharmacyId}/inventory?includeUnavailable=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { results?: InventoryItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setInventory(data.results ?? []);
      setEdits(
        (data.results ?? []).reduce<Record<string, InlineEditState>>((acc, i) => {
          acc[i.id] = { quantity: String(i.quantity), unitPrice: i.unit_price?.toString() ?? "", isAvailable: i.is_available };
          return acc;
        },
        {})
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load inventory", "error");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pharmacyId && token) void fetchInventory();
  }, [pharmacyId, token]);

  const filtered = useMemo(() => {
    let list = inventory;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => (i.medicines?.name ?? "").toLowerCase().includes(q));
    }
    if (stockFilter === "in_stock") list = list.filter((i) => i.is_available && i.quantity > 10);
    if (stockFilter === "low_stock") list = list.filter((i) => i.quantity <= 10 && i.quantity > 0);
    if (stockFilter === "out") list = list.filter((i) => i.quantity === 0 || !i.is_available);
    return list;
  }, [inventory, searchQuery, stockFilter]);

  async function searchMedicineOptions() {
    if (medicineQuery.length < 2) return;
    setLoadingOpts(true);
    try {
      const res = await fetch(`/api/medicines/options?query=${encodeURIComponent(medicineQuery)}`);
      const data = (await res.json()) as { results?: MedicineOption[] };
      setMedicineOptions(data.results ?? []);
    } catch {
      setMedicineOptions([]);
    } finally {
      setLoadingOpts(false);
    }
  }

  async function createMedicineOption() {
    if (!token || newMedicineName.trim().length < 2) return;
    setCreating(true);
    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newMedicineName,
          strength: newMedicineStrength || undefined,
          dosageForm: newMedicineDosageForm || undefined,
          manufacturer: newMedicineManufacturer || undefined,
          genericName: newMedicineGenericName || undefined,
          requiresPrescription: newMedicineRequiresPrescription,
        }),
      });
      const data = (await res.json()) as { medicine?: MedicineOption; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const m = data.medicine!;
      setNewMedicineId(m.id);
      setSelectedMedicineLabel(m.name);
      setMedicineOptions([m]);
      setShowCreateMedicine(false);
      toast(`Created "${m.name}"`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create", "error");
    } finally {
      setCreating(false);
    }
  }

  async function createInventoryItem(e: FormEvent) {
    e.preventDefault();
    if (!pharmacyId || !token || !newMedicineId) {
      toast("Select a medicine first", "error");
      return;
    }
    try {
      const res = await fetch(`/api/pharmacies/${pharmacyId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          medicineId: newMedicineId,
          quantity: Number(newQuantity),
          unitPrice: newUnitPrice ? Number(newUnitPrice) : null,
          isAvailable: newIsAvailable,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setNewMedicineId("");
      setSelectedMedicineLabel("");
      setMedicineQuery("");
      setMedicineOptions([]);
      setNewQuantity("0");
      setNewUnitPrice("");
      setNewIsAvailable(true);
      setShowAddForm(false);
      toast("Item added!");
      void fetchInventory();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to add", "error");
    }
  }

  async function updateInventoryItem(id: string) {
    if (!pharmacyId || !token) return;
    const edit = edits[id];
    if (!edit) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/pharmacies/${pharmacyId}/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          quantity: Number(edit.quantity),
          unitPrice: edit.unitPrice ? Number(edit.unitPrice) : null,
          isAvailable: edit.isAvailable,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast("Updated!");
      void fetchInventory();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deactivateItem(id: string) {
    if (!pharmacyId || !token) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/pharmacies/${pharmacyId}/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAvailable: false }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast("Item deactivated");
      void fetchInventory();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  if (!pharmacyId) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Manage medicines in stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetchInventory()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="gap-2 bg-brand text-white hover:bg-brand/90" onClick={() => setShowAddForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Add Inventory Item</CardTitle>
                <CardDescription>Search or create a medicine, then add stock</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createInventoryItem} className="space-y-4">
                  {selectedMedicineLabel ? (
                    <div className="flex items-center justify-between rounded-lg border border-brand/20 bg-brand/5 px-4 py-2">
                      <span className="font-medium text-slate-900">{selectedMedicineLabel}</span>
                      <button type="button" onClick={() => { setNewMedicineId(""); setSelectedMedicineLabel(""); }} className="text-xs text-slate-500 hover:text-slate-700">Change</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Find medicine</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input value={medicineQuery} onChange={(e) => setMedicineQuery(e.target.value)} placeholder="Search e.g. Paracetamol" className="pl-10" />
                        </div>
                        <Button type="button" variant="outline" onClick={() => void searchMedicineOptions()} disabled={loadingOpts}>Search</Button>
                      </div>
                      {medicineOptions.length > 0 && (
                        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                          {medicineOptions.map((o) => (
                            <li key={o.id}>
                              <button type="button" onClick={() => { setNewMedicineId(o.id); setSelectedMedicineLabel(o.name); }} className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100">
                                {o.name} {o.strength && `(${o.strength})`}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="rounded-lg border border-dashed border-slate-300 p-3">
                        <button type="button" onClick={() => setShowCreateMedicine((v) => !v)} className="flex w-full items-center justify-between text-sm">
                          <span>Medicine not listed? Create new</span>
                          <ChevronDown className={cn("h-4 w-4 transition", showCreateMedicine && "rotate-180")} />
                        </button>
                        {showCreateMedicine && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <Input value={newMedicineName} onChange={(e) => setNewMedicineName(e.target.value)} placeholder="Medicine name *" />
                            <Input value={newMedicineStrength} onChange={(e) => setNewMedicineStrength(e.target.value)} placeholder="Strength" />
                            <div className="flex items-center gap-2 sm:col-span-2">
                              <input type="checkbox" checked={newMedicineRequiresPrescription} onChange={(e) => setNewMedicineRequiresPrescription(e.target.checked)} />
                              <span className="text-sm">Requires prescription</span>
                            </div>
                            <Button type="button" size="sm" onClick={() => void createMedicineOption()} disabled={creating}>{creating ? "Creating..." : "Create & Select"}</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>Quantity</Label>
                      <div className="relative">
                        <Box className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input required inputMode="numeric" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <div>
                      <Label>Unit Price</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input inputMode="decimal" value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} placeholder="Optional" className="pl-10" />
                      </div>
                    </div>
                    <div className="flex items-end pb-2">
                      <Toggle checked={newIsAvailable} onChange={setNewIsAvailable} label="Available" />
                    </div>
                  </div>
                  <Button type="submit" className="gap-2 bg-brand text-white hover:bg-brand/90">
                    <Plus className="h-4 w-4" />
                    Add to Inventory
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search medicine..." className="pl-10" />
            </div>
            <div className="flex gap-1">
              {(["all", "in_stock", "low_stock", "out"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStockFilter(f)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    stockFilter === f ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {f === "all" ? "All" : f === "in_stock" ? "In Stock" : f === "low_stock" ? "Low Stock" : "Out"}
                </button>
              ))}
            </div>
          </div>
          <Badge variant="secondary">{filtered.length} items</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No inventory items match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-500">Medicine</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Qty</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Price</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const edit = edits[item.id] ?? { quantity: String(item.quantity), unitPrice: item.unit_price?.toString() ?? "", isAvailable: item.is_available };
                    return (
                      <tr key={item.id} className="border-b border-slate-100 transition hover:bg-slate-50/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Pill className="h-4 w-4 shrink-0 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900">{item.medicines?.name ?? item.medicine_id}</p>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                {item.medicines?.strength && <span>{item.medicines.strength}</span>}
                                {item.medicines?.requires_prescription && (
                                  <Badge variant="warning" className="gap-0.5 px-1.5 py-0 text-[10px]">
                                    <ShieldCheck className="h-2.5 w-2.5" /> Rx
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            inputMode="numeric"
                            value={edit.quantity}
                            onChange={(e) => setEdits((p) => ({ ...p, [item.id]: { ...edit, quantity: e.target.value } }))}
                            className="h-8 w-16 text-right text-sm"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            inputMode="decimal"
                            value={edit.unitPrice}
                            placeholder="—"
                            onChange={(e) => setEdits((p) => ({ ...p, [item.id]: { ...edit, unitPrice: e.target.value } }))}
                            className="h-8 w-20 text-right text-sm"
                          />
                        </td>
                        <td className="py-3">
                          <Toggle
                            checked={edit.isAvailable}
                            onChange={(v) => setEdits((p) => ({ ...p, [item.id]: { ...edit, isAvailable: v } }))}
                            label=""
                          />
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => void updateInventoryItem(item.id)} disabled={updatingId === item.id} title="Save">
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            {item.is_available && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => void deactivateItem(item.id)} disabled={updatingId === item.id} title="Deactivate">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
