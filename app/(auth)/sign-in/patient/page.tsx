import type { Metadata } from "next";
import { MapPin, Package, Pill, Shield, Truck, Zap } from "lucide-react";

import { PatientAuthClient } from "./_components/patient-auth-client";

export const metadata: Metadata = {
  title: "MediFind | Patient Sign In"
};

const features = [
  {
    icon: Package,
    title: "Find Medicines",
    description: "Search real-time stock across pharmacies near you",
  },
  {
    icon: Truck,
    title: "Home Delivery",
    description: "Request delivery and get medicines at your doorstep",
  },
  {
    icon: MapPin,
    title: "Reserve & Pickup",
    description: "Reserve medicines and pick up from nearby pharmacies",
  },
  {
    icon: Zap,
    title: "Track Orders",
    description: "Follow delivery and reservation status in one place",
  },
];

export default function PatientSignInPage() {
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
              For patients
            </div>
            <h2 className="mt-5 text-3xl font-bold leading-tight text-white xl:text-4xl">
              Find medicine.
              <br />
              Get it delivered.
            </h2>
            <p className="mt-4 max-w-md text-base text-slate-400">
              Sign in to request home delivery, reserve medicines for pickup,
              and track all your orders in one place.
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

          <PatientAuthClient />
        </div>
      </div>
    </main>
  );
}
