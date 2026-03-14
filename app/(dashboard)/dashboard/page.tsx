"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Package,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPharmacySession } from "@/lib/auth/pharmacy-session";

type Stats = {
  totalMedicines: number;
  activeOrders: number;
  pendingDeliveries: number;
  stockAlerts: number;
  reviewCount?: number;
};

const statCards = [
  {
    key: "totalMedicines" as const,
    label: "Total Medicines",
    icon: Package,
    color: "bg-brand/10 text-brand",
  },
  {
    key: "activeOrders" as const,
    label: "Active Orders",
    icon: ShoppingBag,
    color: "bg-blue-50 text-blue-600",
  },
  {
    key: "pendingDeliveries" as const,
    label: "Pending Deliveries",
    icon: Truck,
    color: "bg-amber-50 text-amber-600",
  },
  {
    key: "stockAlerts" as const,
    label: "Stock Alerts",
    icon: AlertTriangle,
    color: "bg-red-50 text-red-600",
  },
  {
    key: "reviewCount" as const,
    label: "Reviews",
    icon: Star,
    color: "bg-amber-50 text-amber-600",
  },
];

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getPharmacySession();
    if (!session?.pharmacy?.id || !session.accessToken) {
      setLoading(false);
      return;
    }

    const pharmacyId = session.pharmacy.id;
    const token = session.accessToken;

    async function fetchStats() {
      try {
        const res = await fetch(`/api/pharmacies/${pharmacyId}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    void fetchStats();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Key metrics for your pharmacy
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading
          ? statCards.map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-6">
                  <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : statCards.map((item, i) => {
              const Wrapper = item.key === "reviewCount" ? Link : "div";
              const wrapperProps = item.key === "reviewCount" ? { href: "/dashboard/reviews" } : {};
              return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Wrapper {...wrapperProps}>
                <Card className={cn(
                  "rounded-2xl border-slate-200/80 transition hover:shadow-md",
                  item.key === "reviewCount" && "cursor-pointer hover:border-amber-200"
                )}>
                  <CardContent className="p-6">
                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      {stats?.[item.key] ?? 0}
                    </p>
                  </CardContent>
                </Card>
                </Wrapper>
              </motion.div>
            );})}
      </div>
    </div>
  );
}
