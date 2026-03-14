"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, LogOut, Package, RefreshCw, ShoppingBag, Star, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { supabaseBrowserClient } from "@/lib/supabase/client";

type OrderResult = {
  id: string;
  pharmacy_id: string;
  medicine_id: string;
  order_type: "reservation" | "delivery";
  quantity: number;
  status: string;
  prescription_required: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  medicines?: { id: string; name: string };
  pharmacies?: { id: string; name: string };
  delivery_requests?: Array<{
    id: string;
    status: string;
    delivery_address: string | null;
    requested_at: string | null;
  }> | {
    id: string;
    status: string;
    delivery_address: string | null;
    requested_at: string | null;
  } | null;
};

const ORDER_STEPS = ["pending", "confirmed", "ready", "completed"] as const;
const DELIVERY_STEPS = ["pending", "accepted", "in_transit", "delivered"] as const;

function OrderStatusTimeline({
  orderStatus,
  deliveryStatus,
  isDelivery,
}: {
  orderStatus: string;
  deliveryStatus?: string | null;
  isDelivery: boolean;
}) {
  const steps = isDelivery ? DELIVERY_STEPS : ORDER_STEPS;
  // For delivery: when order is completed, treat as delivered (handles sync lag or pre-fix data)
  const effectiveDeliveryStatus =
    isDelivery && orderStatus === "completed" ? "delivered" : (deliveryStatus ?? undefined);
  const effectiveStatus = isDelivery ? effectiveDeliveryStatus : orderStatus;
  const currentIdx = isDelivery
    ? DELIVERY_STEPS.indexOf((effectiveDeliveryStatus ?? "pending") as (typeof DELIVERY_STEPS)[number])
    : ORDER_STEPS.indexOf(orderStatus as (typeof ORDER_STEPS)[number]);
  const activeIdx = currentIdx >= 0 ? currentIdx : (orderStatus === "completed" ? steps.length - 1 : 0);

  if (["cancelled", "rejected"].includes(orderStatus) || (isDelivery && ["rejected", "cancelled"].includes(deliveryStatus ?? ""))) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-1 items-center">
          <div
            className={cn(
              "flex h-6 min-w-[24px] items-center justify-center rounded-full text-[10px] font-medium",
              i <= activeIdx ? "bg-brand text-white" : "bg-slate-100 text-slate-400"
            )}
          >
            {i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={cn("h-0.5 flex-1", i < activeIdx ? "bg-brand" : "bg-slate-200")} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-slate-500 capitalize">
        {effectiveStatus ?? orderStatus}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    pending: { label: "Pending", tone: "bg-amber-50 text-amber-800 border border-amber-200" },
    confirmed: { label: "Confirmed", tone: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
    ready: { label: "Ready", tone: "bg-blue-50 text-blue-800 border border-blue-200" },
    completed: { label: "Completed", tone: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
    cancelled: { label: "Cancelled", tone: "bg-slate-100 text-slate-600 border border-slate-200" },
    rejected: { label: "Rejected", tone: "bg-red-50 text-red-800 border border-red-200" },
    accepted: { label: "Accepted", tone: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
    in_transit: { label: "In Transit", tone: "bg-blue-50 text-blue-800 border border-blue-200" },
    delivered: { label: "Delivered", tone: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
  };
  const { label, tone } = map[status] ?? map.pending;
  return <Badge className={tone}>{label}</Badge>;
}

function OrderCard({
  order,
  onCancel,
  cancelling,
  onRate,
}: {
  order: OrderResult;
  onCancel: (id: string) => void;
  cancelling: string | null;
  onRate?: (pharmacyId: string, pharmacyName: string) => void;
}) {
  const isDelivery = order.order_type === "delivery";
  const dr = Array.isArray(order.delivery_requests) ? order.delivery_requests[0] : order.delivery_requests;
  const canRate = ["completed", "delivered"].includes(order.status) || (isDelivery && dr?.status === "delivered");
  // For delivery orders, show delivery status when it's more complete than order status
  const displayStatus =
    isDelivery && dr?.status === "delivered" ? "delivered" : order.status;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 200 }}
    >
      <Card className="card-hover rounded-2xl border-slate-200/80">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
                <Package className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {order.medicines?.name ?? order.medicine_id}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                  {order.pharmacies?.name ?? "Pharmacy"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-[10px]">
                {isDelivery ? <Truck className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                {isDelivery ? "Delivery" : "Reservation"}
              </Badge>
              <StatusBadge status={displayStatus} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
              Qty: {order.quantity}
            </Badge>
            {isDelivery && dr?.delivery_address && (
              <Badge variant="secondary" className="max-w-[200px] truncate text-xs">
                {dr.delivery_address}
              </Badge>
            )}
          </div>
          <OrderStatusTimeline
            orderStatus={order.status}
            deliveryStatus={dr?.status}
            isDelivery={isDelivery}
          />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Placed: {new Date(order.created_at).toLocaleString()}</span>
            <div className="flex gap-2">
              {order.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelling === order.id}
                  onClick={() => onCancel(order.id)}
                >
                  {cancelling === order.id ? "Cancelling..." : "Cancel"}
                </Button>
              )}
              {canRate && onRate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => onRate(order.pharmacy_id, order.pharmacies?.name ?? "Pharmacy")}
                >
                  <Star className="h-3 w-3" />
                  Rate
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PatientDashboardClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [rateDialog, setRateDialog] = useState<{ pharmacyId: string; pharmacyName: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [favorites, setFavorites] = useState<Array<{ id: string; pharmacyId: string; pharmacy: { id: string; name: string; address_line1?: string; city?: string } }>>([]);

  async function refreshOrders() {
    const { data } = await supabaseBrowserClient.auth.getSession();
    if (!data.session) return;
    try {
      setLoading(true);
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      const payload = (await res.json()) as { results?: OrderResult[]; error?: string };
      if (res.ok && payload.results) setOrders(payload.results);
    } catch {
      toast("Failed to refresh orders", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      const { data } = await supabaseBrowserClient.auth.getSession();
      if (!data.session) {
        router.replace("/sign-in/patient?redirect=/patient");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [ordersRes, favoritesRes] = await Promise.all([
          fetch("/api/orders", {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            cache: "no-store",
          }),
          fetch("/api/pharmacies/favorites", {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          }),
        ]);
        const payload = (await ordersRes.json()) as {
          results?: OrderResult[];
          error?: string;
          details?: string;
        };
        if (!ordersRes.ok || !payload.results) {
          throw new Error(payload.error ?? payload.details ?? "Failed to load orders.");
        }
        setOrders(payload.results);
        const favPayload = (await favoritesRes.json()) as { favorites?: Array<{ id: string; pharmacyId: string; pharmacy: unknown }> };
        setFavorites((favPayload.favorites ?? []).map((f) => ({ ...f, pharmacy: f.pharmacy as { id: string; name: string; address_line1?: string; city?: string } })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error while loading orders.");
        toast(err instanceof Error ? err.message : "Failed to load orders.", "error");
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, [router, toast]);

  const reservations = useMemo(() => orders.filter((o) => o.order_type === "reservation"), [orders]);
  const deliveries = useMemo(() => orders.filter((o) => o.order_type === "delivery"), [orders]);

  async function submitRating() {
    if (!rateDialog) return;
    const { data } = await supabaseBrowserClient.auth.getSession();
    if (!data.session) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/pharmacies/${rateDialog.pharmacyId}/reviews/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ rating, comment: ratingComment || undefined }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed");
      toast("Thanks for your rating!");
      setRateDialog(null);
      setRating(5);
      setRatingComment("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to submit rating.", "error");
    } finally {
      setSubmittingRating(false);
    }
  }

  async function cancelOrder(orderId: string) {
    const { data } = await supabaseBrowserClient.auth.getSession();
    if (!data.session) {
      router.replace("/sign-in/patient?redirect=/patient");
      return;
    }
    setCancelling(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const payload = (await response.json()) as { error?: string; details?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? payload.details ?? "Failed to cancel order.");
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
      toast("Order cancelled.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to cancel order.", "error");
    } finally {
      setCancelling(null);
    }
  }

  const hasOrders = orders.length > 0;
  const hasReservations = reservations.length > 0;
  const hasDeliveries = deliveries.length > 0;

  async function signOut() {
    const { data } = await supabaseBrowserClient.auth.getSession();
    if (data.session?.access_token) {
      try {
        await fetch("/api/auth/sign-out", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
      } catch {
        /* ignore */
      }
    }
    await supabaseBrowserClient.auth.signOut();
    router.replace("/");
  }

  return (
    <>
      <section className="border-b border-slate-200/60 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
                <Package className="h-6 w-6 text-brand" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Orders</h1>
                <p className="text-sm text-slate-500">Track reservations and home delivery requests</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              {hasOrders && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refreshOrders()}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void signOut()}
                className="gap-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="saas-page space-y-8 pt-10">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !hasOrders ? (
          <Card className="rounded-2xl border-dashed border-slate-300 bg-slate-50/50">
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">No orders yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Search for medicines and request delivery or reservation to see them here.
                </p>
              </div>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
              >
                <Package className="h-4 w-4" />
                Search medicines
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {favorites.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Heart className="h-5 w-5 text-rose-500" />
                  Favorite Pharmacies
                  <Badge variant="secondary" className="text-xs">{favorites.length}</Badge>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {favorites.map((fav) => (
                    <Card key={fav.id} className="rounded-2xl border-slate-200/80">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Link href={`/search?pharmacy=${fav.pharmacyId}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
                            <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">{fav.pharmacy?.name ?? "Pharmacy"}</p>
                            {(fav.pharmacy?.address_line1 || fav.pharmacy?.city) && (
                              <p className="truncate text-xs text-slate-500">
                                {[fav.pharmacy.address_line1, fav.pharmacy.city].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-slate-500 hover:text-rose-600"
                          onClick={async () => {
                            const { data } = await supabaseBrowserClient.auth.getSession();
                            if (!data.session) return;
                            try {
                              const res = await fetch(`/api/pharmacies/${fav.pharmacyId}/favorites`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${data.session.access_token}` },
                              });
                              if (res.ok) {
                                setFavorites((p) => p.filter((f) => f.pharmacyId !== fav.pharmacyId));
                                toast("Removed from favorites");
                              }
                            } catch {
                              toast("Failed to remove", "error");
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {hasDeliveries && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Truck className="h-5 w-5 text-brand" />
                  Home Delivery
                  <Badge variant="secondary" className="text-xs">{deliveries.length}</Badge>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {deliveries.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={cancelOrder}
                      cancelling={cancelling}
                      onRate={(pharmacyId, pharmacyName) => setRateDialog({ pharmacyId, pharmacyName })}
                    />
                  ))}
                </div>
              </div>
            )}

            {hasReservations && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <ShoppingBag className="h-5 w-5 text-brand" />
                  Reservations
                  <Badge variant="secondary" className="text-xs">{reservations.length}</Badge>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {reservations.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={cancelOrder}
                      cancelling={cancelling}
                      onRate={(pharmacyId, pharmacyName) => setRateDialog({ pharmacyId, pharmacyName })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={!!rateDialog} onClose={() => setRateDialog(null)}>
        {rateDialog && (
          <>
            <DialogHeader>
              <DialogTitle>Rate {rateDialog.pharmacyName}</DialogTitle>
              <DialogDescription>How was your experience?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="rounded-lg p-2 transition hover:bg-slate-100"
                  >
                    <Star
                      className={cn("h-8 w-8", s <= rating ? "fill-amber-500 text-amber-500" : "text-slate-300")}
                    />
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Optional comment"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={2}
              />
              <Button
                onClick={() => void submitRating()}
                disabled={submittingRating}
                className="w-full gap-2 bg-brand text-white hover:bg-brand/90"
              >
                <Star className="h-4 w-4" />
                {submittingRating ? "Submitting..." : "Submit rating"}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
