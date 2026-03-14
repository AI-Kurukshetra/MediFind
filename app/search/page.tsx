import type { Metadata } from "next";
import { Pill, MapPin, Clock } from "lucide-react";

import { MedicineSearchClient } from "./_components/medicine-search-client";

export const metadata: Metadata = {
  title: "MediFind | Medicine Search"
};

export default function SearchPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-gradient border-b border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <Pill className="h-7 w-7 text-brand" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Find Your Medicine{" "}
              <span className="text-brand">Nearby</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
              Search real-time medicine availability across pharmacies near you.
              Compare stock, distance, and get it delivered to your door.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand" />
                Location-based results
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand" />
                Real-time stock data
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Search UI */}
      <main className="saas-page space-y-8">
        <MedicineSearchClient />
      </main>
    </>
  );
}
