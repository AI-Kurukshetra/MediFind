"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, RefreshCw, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getPharmacySession } from "@/lib/auth/pharmacy-session";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function ReviewsSection() {
  const { toast } = useToast();
  const session = getPharmacySession();
  const pharmacyId = session?.pharmacy?.id ?? null;
  const token = session?.accessToken ?? null;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchReviews() {
    if (!pharmacyId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacies/${pharmacyId}/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        reviews?: Review[];
        averageRating?: number | null;
        count?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setReviews(data.reviews ?? []);
      setAverageRating(data.averageRating ?? null);
      setCount(data.count ?? 0);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load reviews", "error");
      setReviews([]);
      setAverageRating(null);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pharmacyId && token) void fetchReviews();
  }, [pharmacyId, token]);

  const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({
    stars: r,
    count: reviews.filter((rev) => rev.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter((rev) => rev.rating === r).length / reviews.length) * 100 : 0,
  }));

  if (!pharmacyId) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Reviews</h1>
          <p className="mt-1 text-sm text-slate-500">See what patients say about your pharmacy</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchReviews()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : reviews.length === 0 ? (
        <Card className="overflow-hidden rounded-2xl border-dashed border-slate-300 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
          <CardContent className="flex flex-col items-center gap-6 py-16">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100/80 shadow-inner">
              <Star className="h-10 w-10 text-amber-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900">No reviews yet</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                When patients complete orders and rate your pharmacy, their reviews will appear here.
              </p>
            </div>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              Encourage patients to rate after delivery
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Hero rating card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-xl"
          >
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                  <span className="text-4xl font-bold text-white">
                    {averageRating != null ? averageRating.toFixed(1) : "—"}
                  </span>
                </div>
                <div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-6 w-6",
                          averageRating != null && s <= Math.round(averageRating)
                            ? "fill-white text-white"
                            : "fill-white/40 text-white/40"
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {count} review{count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex-1 sm:max-w-xs">
                <div className="space-y-2">
                  {ratingDistribution.map(({ stars, count: c, pct }) => (
                    <div key={stars} className="flex items-center gap-3">
                      <span className="flex w-16 items-center gap-1 text-sm text-white">
                        {stars} <Star className="h-3.5 w-3.5 fill-white" />
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-white"
                        />
                      </div>
                      <span className="w-8 text-right text-sm text-white/90">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Reviews list */}
          <Card className="rounded-2xl border-slate-200">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <MessageSquare className="h-5 w-5 text-brand" />
                All Reviews
              </h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {reviews.map((review, i) => (
                  <motion.li
                    key={review.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50/30 p-4 transition hover:border-amber-200/50 hover:bg-amber-50/20"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <Star className="h-5 w-5 fill-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn(
                                "h-4 w-4",
                                s <= review.rating ? "fill-amber-500 text-amber-500" : "text-slate-200"
                              )}
                            />
                          ))}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {review.rating}/5
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(review.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
