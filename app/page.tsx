import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
  Pill,
  Shield,
  Store,
  Truck,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "MediFind | Find Medicine Nearby Instantly",
  description:
    "Search real-time medicine availability across pharmacies near you. Reserve or get delivery in minutes.",
};

export default function HomePage() {
  return (
    <main>
      {/* Hero with search CTA */}
      <section className="relative overflow-hidden border-b border-slate-200/60">
        <div className="absolute inset-0 hero-gradient opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,165,0.15),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-sm font-medium text-brand">
              <Zap className="h-4 w-4" />
              Real-time stock across pharmacies
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Find your medicine
              <br />
              <span className="text-brand">nearby in seconds</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 sm:text-xl">
              No more visiting multiple pharmacies. Search availability, compare
              distance, and reserve or get delivery — all in one place.
            </p>
            <Link
              href="/search"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-brand px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand/90 hover:shadow-xl hover:shadow-brand/30"
            >
              <Package className="h-5 w-5" />
              Search medicines now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-slate-200/60 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-slate-600">
              Three simple steps to get your medicine
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: Package,
                title: "Search",
                desc: "Enter the medicine name and your location. We check live stock across nearby pharmacies.",
              },
              {
                step: "02",
                icon: MapPin,
                title: "Compare",
                desc: "See which pharmacies have it, how far they are, and how much is in stock.",
              },
              {
                step: "03",
                icon: Truck,
                title: "Reserve or deliver",
                desc: "Reserve for pickup or request home delivery. The pharmacy gets notified instantly.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-brand/20 hover:shadow-lg"
              >
                <span className="text-4xl font-bold text-slate-100 group-hover:text-brand/20">
                  {item.step}
                </span>
                <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Pharmacies */}
      <section className="border-b border-slate-200/60 bg-slate-50/80 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600">
                <Store className="h-4 w-4 text-brand" />
                For pharmacy owners
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">
                Reach more patients.
                <br />
                <span className="text-brand">Manage less hassle.</span>
              </h2>
              <p className="mt-4 text-slate-600">
                Join MediFind to appear in local medicine searches, receive
                delivery and reservation requests, and manage your inventory from
                one dashboard. Free to get started.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Real-time inventory sync",
                  "Location-based discovery",
                  "Delivery & reservation requests",
                  "Simple dashboard",
                ].map((text) => (
                  <li key={text} className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" />
                    {text}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-in"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Register your pharmacy
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                    <Pill className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">MediFind Dashboard</p>
                    <p className="text-xs text-slate-500">Inventory • Orders • Analytics</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {["Paracetamol 500mg — 1,296 in stock", "Amoxicillin — 45 in stock", "Ibuprofen — 89 in stock"].map(
                    (item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm"
                      >
                        <span className="text-slate-700">{item}</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Available
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-slate-200/60 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <Shield className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Secure & private</p>
                <p className="text-xs text-slate-500">Your data is protected</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <Zap className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Live stock data</p>
                <p className="text-xs text-slate-500">Updated in real time</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <MapPin className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Location-based</p>
                <p className="text-xs text-slate-500">Find nearby pharmacies</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-10">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Ready to find your medicine?
          </h2>
          <p className="mt-3 text-slate-600">
            Search availability across pharmacies near you. No sign-up required
            to search.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
            >
              <Package className="h-4 w-4" />
              Search medicines
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Store className="h-4 w-4" />
              Pharmacy sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
