"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, MapPin, RefreshCw, Truck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getPharmacySession } from "@/lib/auth/pharmacy-session";

type DeliveryRequest = {
  id: string;
  status: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  requested_at: string;
};

type Order = {
  id: string;
  medicine_id: string;
  quantity: number;
  medicines?: { id: string; name: string } | null;
  pharmacies?: { id: string; name: string; latitude: number | null; longitude: number | null } | null;
  delivery_requests?: DeliveryRequest[] | null;
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function DeliveriesSection() {
  const { toast } = useToast();
  const session = getPharmacySession();
  const token = session?.accessToken ?? null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchDeliveries() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        "/api/orders?orderType=delivery&status=pending",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = (await res.json()) as { results?: Order[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setOrders(data.results ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load deliveries", "error");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) void fetchDeliveries();
  }, [token]);

  async function updateDeliveryStatus(
    deliveryRequestId: string,
    status: "accepted" | "rejected"
  ) {
    if (!token) return;
    setUpdatingId(deliveryRequestId);
    try {
      const res = await fetch(`/api/delivery-requests/${deliveryRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast(status === "accepted" ? "Delivery accepted" : "Delivery rejected");
      void fetchDeliveries();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  const items = orders.flatMap((order) => {
    const raw = order.delivery_requests;
    const drs = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const ph = order.pharmacies;
    const phLat = ph?.latitude ?? null;
    const phLon = ph?.longitude ?? null;
    return drs
      .filter((dr) => dr.status === "pending")
      .map((dr) => {
        let distanceKm: number | null = null;
        if (
          phLat != null &&
          phLon != null &&
          dr.delivery_latitude != null &&
          dr.delivery_longitude != null
        ) {
          distanceKm = haversineKm(
            phLat,
            phLon,
            dr.delivery_latitude,
            dr.delivery_longitude
          );
        }
        return {
          order,
          deliveryRequest: dr,
          distanceKm,
        };
      });
  });

  if (!token) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Accept or reject pending delivery requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchDeliveries()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Pending Deliveries</h2>
          <Badge variant="secondary">{items.length} requests</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Truck className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No pending delivery requests.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map(({ order, deliveryRequest, distanceKm }) => (
                <motion.li
                  key={deliveryRequest.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {order.medicines?.name ?? order.medicine_id}
                    </p>
                    <p className="text-sm text-slate-500">Qty: {order.quantity}</p>
                    <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span className="line-clamp-2">{deliveryRequest.delivery_address}</span>
                    </div>
                    {distanceKm != null && (
                      <p className="mt-1 text-xs text-slate-500">
                        ~{distanceKm.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => void updateDeliveryStatus(deliveryRequest.id, "accepted")}
                      disabled={updatingId === deliveryRequest.id}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => void updateDeliveryStatus(deliveryRequest.id, "rejected")}
                      disabled={updatingId === deliveryRequest.id}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
