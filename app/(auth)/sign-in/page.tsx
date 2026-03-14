import type { Metadata } from "next";
import { BarChart3, MapPin, Package, Pill, Shield, Zap } from "lucide-react";

import { PharmacyAuthClient } from "./_components/pharmacy-auth-client";

export const metadata: Metadata = {
  title: "MediFind | Login"
};

const features = [
  {
    icon: Package,
    title: "Real-time Inventory",
    description: "Track stock levels across your pharmacy in real time",
  },
  {
    icon: MapPin,
    title: "Location Discovery",
    description: "Patients find you based on proximity and medicine availability",
  },
  {
    icon: Zap,
    title: "Instant Orders",
    description: "Receive delivery and reservation requests automatically",
  },
  {
    icon: BarChart3,
    title: "Smart Dashboard",
    description: "Manage medicines, orders, and prescriptions from one place",
  },
];

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)]">
      {/* Left brand panel */}
      <div className="hidden w-[48%] flex-col justify-between bg-slate-900 p-10 lg:flex xl:p-14">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-white">
              Medi<span className="text-brand">Find</span>
            </span>
          </div>

          <div className="mt-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
              <Shield className="h-3.5 w-3.5 text-brand" />
              Trusted by pharmacies
            </div>
            <h2 className="mt-5 text-3xl font-bold leading-tight text-white xl:text-4xl">
              Modern pharmacy
              <br />
              operations platform
            </h2>
            <p className="mt-4 max-w-md text-base text-slate-400">
              Join MediFind to manage your inventory, reach more patients, and
              process delivery requests — all from a single dashboard.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/20">
                  <f.icon className="h-4 w-4 text-brand" />
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{f.title}</p>
                <p className="mt-1 text-xs text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} MediFind. All rights reserved.
        </p>
      </div>

      {/* Right auth form */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-10 sm:px-8 lg:items-center lg:py-0">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900">
              Medi<span className="text-brand">Find</span>
            </span>
          </div>

          <PharmacyAuthClient />
        </div>
      </div>
    </main>
  );
}
