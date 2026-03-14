"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, RefreshCw, ShoppingBag, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getPharmacySession } from "@/lib/auth/pharmacy-session";

type Order = {
  id: string;
  user_id: string;
  pharmacy_id: string;
  medicine_id: string;
  order_type: "reservation" | "delivery";
  quantity: number;
  status: string;
  prescription_required: boolean;
  notes: string | null;
  created_at: string;
  medicines?: { id: string; name: string } | null;
  pharmacies?: { id: string; name: string } | null;
  delivery_requests?: Array<{
    id: string;
    status: string;
    delivery_address: string;
    requested_at: string;
  }> | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  ready: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export function OrdersSection() {
  const { toast } = useToast();
  const session = getPharmacySession();
  const token = session?.accessToken ?? null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchOrders() {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { results?: Order[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setOrders(data.results ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load orders", "error");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) void fetchOrders();
  }, [token, statusFilter]);

  async function updateStatus(orderId: string, status: "confirmed" | "rejected" | "ready" | "completed") {
    if (!token) return;
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const labels: Record<string, string> = {
        confirmed: "Order confirmed",
        rejected: "Order rejected",
        ready: "Marked ready for pickup",
        completed: "Order completed",
      };
      toast(labels[status] ?? "Updated");
      void fetchOrders();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  const statuses = ["all", "pending", "confirmed", "rejected", "ready", "completed", "cancelled"] as const;

  if (!token) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Manage reservations and delivery requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchOrders()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  statusFilter === s ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <Badge variant="secondary">{orders.length} orders</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <ShoppingBag className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No orders match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-500">Order</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-500">Medicine</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Qty</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-500">Type</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-slate-100 transition hover:bg-slate-50/50"
                    >
                      <td className="py-3">
                        <p className="font-mono text-xs text-slate-600">{order.id.slice(0, 8)}…</p>
                        <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3">
                        <p className="font-medium text-slate-900">{order.medicines?.name ?? order.medicine_id}</p>
                        {order.prescription_required && (
                          <Badge variant="warning" className="mt-0.5 text-[10px]">Rx</Badge>
                        )}
                      </td>
                      <td className="py-3 text-right font-medium">{order.quantity}</td>
                      <td className="py-3">
                        <span className="text-sm capitalize">{order.order_type}</span>
                      </td>
                      <td className="py-3">
                        <Badge className={cn("text-xs", statusColors[order.status] ?? "bg-slate-100 text-slate-600")}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {order.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => void updateStatus(order.id, "confirmed")}
                              disabled={updatingId === order.id}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => void updateStatus(order.id, "rejected")}
                              disabled={updatingId === order.id}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {order.status === "confirmed" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              className="h-8 gap-1 bg-blue-600 text-white hover:bg-blue-700"
                              onClick={() => void updateStatus(order.id, "ready")}
                              disabled={updatingId === order.id}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Mark Ready
                            </Button>
                          </div>
                        )}
                        {order.status === "ready" && (
                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => void updateStatus(order.id, "completed")}
                            disabled={updatingId === order.id}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Complete
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
