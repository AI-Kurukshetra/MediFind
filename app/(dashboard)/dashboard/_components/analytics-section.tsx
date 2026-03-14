"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getPharmacySession } from "@/lib/auth/pharmacy-session";

type Order = {
  id: string;
  medicine_id: string;
  order_type: "reservation" | "delivery";
  quantity: number;
  status: string;
  medicines?: { id: string; name: string } | null;
};

export function AnalyticsSection() {
  const { toast } = useToast();
  const session = getPharmacySession();
  const token = session?.accessToken ?? null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrders() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders?limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { results?: Order[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setOrders(data.results ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load analytics", "error");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) void fetchOrders();
  }, [token]);

  const topMedicines = useMemo(() => {
    const byMedicine: Record<string, { name: string; count: number; qty: number }> = {};
    for (const o of orders) {
      const name = o.medicines?.name ?? o.medicine_id;
      if (!byMedicine[name]) byMedicine[name] = { name, count: 0, qty: 0 };
      byMedicine[name].count += 1;
      byMedicine[name].qty += o.quantity;
    }
    return Object.values(byMedicine)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [orders]);

  const byStatus = useMemo(() => {
    const by: Record<string, number> = {};
    for (const o of orders) {
      by[o.status] = (by[o.status] ?? 0) + 1;
    }
    return Object.entries(by).map(([status, count]) => ({ status, count }));
  }, [orders]);

  const byType = useMemo(() => {
    const by: Record<string, number> = {};
    for (const o of orders) {
      by[o.order_type] = (by[o.order_type] ?? 0) + 1;
    }
    return Object.entries(by).map(([type, count]) => ({ type, count }));
  }, [orders]);

  if (!token) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Insights from your orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchOrders()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-brand" />
              Top Medicines by Orders
            </CardTitle>
            <CardDescription>Most ordered medicines</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : topMedicines.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                No order data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topMedicines} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => (v.length > 12 ? v.slice(0, 12) + "…" : v)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [value ?? 0, "Orders"]} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Orders by Status</CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : byStatus.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                No order data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byStatus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Orders by Type</CardTitle>
            <CardDescription>Reservation vs delivery</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : byType.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                No order data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byType} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
