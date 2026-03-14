"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pill,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  clearPharmacySession,
  getPharmacySession,
  setPharmacySession,
  type PharmacySession,
} from "@/lib/auth/pharmacy-session";

type PharmacyProfile = { id: string; name: string };

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/deliveries", label: "Deliveries", icon: Truck },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<PharmacySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = getPharmacySession();
    if (!saved?.accessToken) {
      clearPharmacySession();
      setLoading(false);
      router.replace("/sign-in");
      return;
    }

    async function bootstrap() {
      if (saved!.pharmacy) {
        setSession(saved!);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/pharmacies/me", {
          headers: { Authorization: `Bearer ${saved!.accessToken}` },
        });
        const payload = (await res.json()) as { primaryPharmacy?: PharmacyProfile | null; error?: string };
        if (!res.ok || !payload.primaryPharmacy) {
          clearPharmacySession();
          setSession(null);
          router.replace("/sign-in");
          return;
        }
        const hydrated: PharmacySession = {
          ...saved!,
          pharmacy: payload.primaryPharmacy,
        };
        setSession(hydrated);
        setPharmacySession(hydrated);
      } catch {
        clearPharmacySession();
        router.replace("/sign-in");
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!session?.pharmacy) {
    return null;
  }

  const initials = session.user?.email
    ? session.user.email.slice(0, 2).toUpperCase()
    : "PH";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:flex",
          sidebarOpen ? "flex" : "hidden lg:flex"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 lg:justify-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <Pill className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-900">
              Medi<span className="text-brand">Find</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay - mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center gap-2 lg:flex-none">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-brand" />
              <span className="font-semibold text-slate-900">{session.pharmacy.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
              {initials}
            </div>
            <button
              type="button"
              onClick={() => {
                clearPharmacySession();
                router.replace("/sign-in");
              }}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
