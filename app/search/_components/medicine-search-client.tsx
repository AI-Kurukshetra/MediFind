"use client";

import "leaflet/dist/leaflet.css";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronDown,
  Heart,
  Locate,
  MapPin,
  Package,
  Search,
  SearchX,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { supabaseBrowserClient } from "@/lib/supabase/client";

type SearchResult = {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyLatitude?: number | null;
  pharmacyLongitude?: number | null;
  medicineId: string;
  medicineName: string;
  quantity: number;
  distanceKm: number;
  unitPrice?: number | null;
  pharmacyRating?: number | null;
  pharmacyReviewCount?: number;
};

type SearchResponse = {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  count: number;
  results: SearchResult[];
};

type MedicineOption = { id: string; name: string };

const RADIUS_OPTIONS = [
  { label: "5 km", value: "5" },
  { label: "10 km", value: "10" },
  { label: "25 km", value: "25" },
  { label: "50 km", value: "50" },
];

const DEFAULT_LATITUDE = "28.6139";
const DEFAULT_LONGITUDE = "77.2090";

type LeafletBundle = {
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
};

function ResultSkeleton() {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="space-y-3 p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MedicineSearchClient() {
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [latitude, setLatitude] = useState(DEFAULT_LATITUDE);
  const [longitude, setLongitude] = useState(DEFAULT_LONGITUDE);
  const [radiusKm, setRadiusKm] = useState("10");
  const [sortBy, setSortBy] = useState<"distance" | "price">("distance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [leaflet, setLeaflet] = useState<LeafletBundle | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [locationDetected, setLocationDetected] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [suggestions, setSuggestions] = useState<MedicineOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [orderMode, setOrderMode] = useState<"delivery" | "reservation">("delivery");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryQuantity, setDeliveryQuantity] = useState("1");
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    let mounted = true;
    async function loadLeaflet() {
      try {
        const [rl, leaf] = await Promise.all([import("react-leaflet"), import("leaflet")]);
        leaf.Icon.Default.mergeOptions({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        if (mounted) {
          setLeaflet({
            MapContainer: rl.MapContainer,
            TileLayer: rl.TileLayer,
            Marker: rl.Marker,
            Popup: rl.Popup,
          });
        }
      } catch {
        // map library failed to load
      }
    }
    loadLeaflet();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    async function loadFavorites() {
      const { data } = await supabaseBrowserClient.auth.getSession();
      if (!data.session) return;
      try {
        const res = await fetch("/api/pharmacies/favorites", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const p = (await res.json()) as { favorites?: Array<{ pharmacyId: string }> };
        setFavoriteIds(new Set((p.favorites ?? []).map((f) => f.pharmacyId)));
      } catch {
        // ignore
      }
    }
    void loadFavorites();
  }, []);

  async function toggleFavorite(pharmacyId: string) {
    const { data } = await supabaseBrowserClient.auth.getSession();
    if (!data.session) {
      toast("Sign in to save favorites", "error");
      return;
    }
    setTogglingFavorite(pharmacyId);
    const isFav = favoriteIds.has(pharmacyId);
    try {
      const res = await fetch(`/api/pharmacies/${pharmacyId}/favorites`, {
        method: isFav ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed");
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(pharmacyId);
        else next.add(pharmacyId);
        return next;
      });
      toast(isFav ? "Removed from favorites" : "Added to favorites");
    } catch {
      toast("Failed to update favorite", "error");
    } finally {
      setTogglingFavorite(null);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function restorePendingDelivery() {
      const { data } = await supabaseBrowserClient.auth.getSession();
      if (!data.session) return;
      try {
        const raw = sessionStorage.getItem("medifind_pending_delivery");
        if (!raw) return;
        const pending = JSON.parse(raw) as SearchResult & { query?: string; latitude?: string; longitude?: string; radiusKm?: string };
        sessionStorage.removeItem("medifind_pending_delivery");
        const result: SearchResult = {
          pharmacyId: pending.pharmacyId,
          pharmacyName: pending.pharmacyName,
          pharmacyLatitude: pending.pharmacyLatitude,
          pharmacyLongitude: pending.pharmacyLongitude,
          medicineId: pending.medicineId,
          medicineName: pending.medicineName,
          quantity: pending.quantity,
          distanceKm: pending.distanceKm,
        };
        if (pending.query) setQuery(pending.query);
        if (pending.latitude) setLatitude(pending.latitude);
        if (pending.longitude) setLongitude(pending.longitude);
        if (pending.radiusKm) setRadiusKm(pending.radiusKm);
        setSelectedResult(result);
        setOrderMode("delivery");
        setDeliveryAddress("");
        setDeliveryPhone("");
        setDeliveryNotes("");
        setDeliveryQuantity("1");
        setDeliveryOpen(true);
      } catch {
        /* ignore */
      }
    }
    void restorePendingDelivery();
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/medicines/options?query=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      // silently fail autocomplete
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  function selectSuggestion(name: string) {
    setQuery(name);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported by your browser.", "error");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocationDetected(true);
        setDetectingLocation(false);
        toast("Location detected successfully!");
      },
      () => {
        setDetectingLocation(false);
        toast("Unable to detect location. Please enter manually.", "error");
        setShowAdvanced(true);
      }
    );
  }

  const hasResults = (response?.results.length ?? 0) > 0;
  const emptyState = !loading && response && !hasResults;

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ query, latitude, longitude, radiusKm, sortBy });
      const result = await fetch(`/api/medicines/search?${params.toString()}`, { method: "GET" });
      const payload = (await result.json()) as SearchResponse | { error?: string; details?: string };

      if (!result.ok) {
        const message = "error" in payload && payload.error ? payload.error : "Unable to search medicines right now.";
        throw new Error(message);
      }

      setResponse(payload as SearchResponse);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Unexpected error while searching medicines.";
      setResponse(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const mapCenter: [number, number] = useMemo(() => {
    if (response?.latitude && response?.longitude) return [response.latitude, response.longitude];
    return [Number(latitude) || 0, Number(longitude) || 0];
  }, [response, latitude, longitude]);

  async function refetchWithSort(newSortBy: "distance" | "price") {
    if (!response || !query) return;
    setSortBy(newSortBy);
    setLoading(true);
    try {
      const params = new URLSearchParams({ query, latitude, longitude, radiusKm, sortBy: newSortBy });
      const r = await fetch(`/api/medicines/search?${params.toString()}`);
      const p = (await r.json()) as SearchResponse;
      setResponse(p);
    } catch {
      // keep current response
    } finally {
      setLoading(false);
    }
  }

  const PENDING_DELIVERY_KEY = "medifind_pending_delivery";

  async function ensureSignedIn(pendingResult?: SearchResult) {
    const { data } = await supabaseBrowserClient.auth.getSession();
    if (!data.session) {
      if (pendingResult) {
        try {
          sessionStorage.setItem(
            PENDING_DELIVERY_KEY,
            JSON.stringify({
              ...pendingResult,
        query,
        latitude,
        longitude,
              radiusKm,
            })
          );
        } catch {
          /* ignore */
        }
      }
      const searchParams = new URLSearchParams({ query, latitude, longitude, radiusKm }).toString();
      window.location.href = `/sign-in/patient?redirect=/search?${searchParams}`;
      return null;
    }
    return data.session;
  }

  function openOrderDialog(result: SearchResult, mode: "delivery" | "reservation") {
    setOrderMode(mode);
    setSelectedResult(result);
    setDeliveryAddress("");
    setDeliveryPhone("");
    setDeliveryNotes("");
    setDeliveryQuantity("1");
    setDeliveryOpen(true);
  }

  async function openDelivery(result: SearchResult) {
    const session = await ensureSignedIn(result);
    if (!session) return;
    openOrderDialog(result, "delivery");
  }

  async function openReservation(result: SearchResult) {
    const session = await ensureSignedIn(result);
    if (!session) return;
    openOrderDialog(result, "reservation");
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedResult) return;
    const session = await ensureSignedIn();
    if (!session) return;
    if (orderMode === "delivery" && !deliveryAddress.trim()) {
      toast("Delivery address is required", "error");
      return;
    }

    setDeliveryLoading(true);

    try {
      const payload: Record<string, unknown> = {
        pharmacyId: selectedResult.pharmacyId,
        medicineId: selectedResult.medicineId,
        quantity: Number(deliveryQuantity) || 1,
        orderType: orderMode,
        notes: deliveryNotes || undefined,
      };
      if (orderMode === "delivery") {
        payload.deliveryAddress = deliveryAddress;
        payload.deliveryLatitude = Number(latitude);
        payload.deliveryLongitude = Number(longitude);
        payload.contactPhone = deliveryPhone || undefined;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const payloadResp = (await res.json()) as { error?: string; details?: string };
      if (!res.ok) throw new Error(payloadResp.error ?? payloadResp.details ?? "Failed to create order.");

      setDeliveryOpen(false);
      try {
        sessionStorage.removeItem(PENDING_DELIVERY_KEY);
      } catch {
        /* ignore */
      }
      toast(orderMode === "delivery" ? "Delivery request sent! The pharmacy will be notified." : "Reservation request sent!");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unexpected error while requesting delivery.", "error");
    } finally {
      setDeliveryLoading(false);
    }
  }

  return (
    <section className="space-y-8">
      {/* Search Form */}
      <Card className="search-glow rounded-2xl border-slate-200/80 bg-white">
        <CardContent className="p-5 sm:p-6">
          <form className="space-y-5" onSubmit={handleSearch}>
            {/* Medicine name with autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <Label htmlFor="medicine-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Medicine name
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="medicine-name"
                required
                minLength={2}
                value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search for Paracetamol, Amoxicillin, Ibuprofen..."
                  className="h-12 pl-10 text-base"
                  autoComplete="off"
                />
              </div>
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectSuggestion(s.name)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-brand/5 hover:text-brand"
                      >
                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {s.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 border-brand/30 text-brand hover:bg-brand/5 hover:text-brand"
                  onClick={detectLocation}
                  disabled={detectingLocation}
                >
                  <Locate className={cn("h-4 w-4", detectingLocation && "animate-pulse")} />
                  {detectingLocation ? "Detecting..." : locationDetected ? "Location updated" : "Use my location"}
                </Button>

                {locationDetected && (
                  <Badge variant="success" className="gap-1.5">
                    <MapPin className="h-3 w-3" />
                    Location detected
                  </Badge>
                )}

                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-700"
                >
                  Advanced
                  <ChevronDown className={cn("h-3.5 w-3.5 transition", showAdvanced && "rotate-180")} />
                </button>
              </div>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-3 pt-1 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="latitude" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Latitude
                </Label>
                <Input
                  id="latitude"
                  required
                  value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                  inputMode="decimal"
                          className="h-10 text-sm"
                />
              </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="longitude" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Longitude
                </Label>
                <Input
                  id="longitude"
                  required
                  value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                  inputMode="decimal"
                          className="h-10 text-sm"
                />
              </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Radius & Submit */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Search radius
                </Label>
                <div className="flex gap-1.5">
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRadiusKm(opt.value)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-xs font-semibold transition",
                        radiusKm === opt.value
                          ? "bg-brand text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
            </div>

              <Button type="submit" disabled={loading} className="h-11 gap-2 bg-brand px-6 text-white hover:bg-brand/90">
                <Search className="h-4 w-4" />
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>

            {response && !loading && (
              <p className="text-sm text-slate-500">
                {response.count} result{response.count === 1 ? "" : "s"} within {response.radiusKm} km
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-red-700">
              <SearchX className="h-5 w-5 shrink-0" />
              {error}
            </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Map + Results grid */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Map */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm">
          <CardHeader className="space-y-1 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <MapPin className="h-4 w-4 text-brand" />
                Map View
              </CardTitle>
              {hasResults && (
                <Badge variant="secondary" className="text-xs">
                  {response!.count} {response!.count === 1 ? "pharmacy" : "pharmacies"}
                </Badge>
              )}
            </div>
            <CardDescription>Pharmacies with the searched medicine near you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isClient || !leaflet ? (
              <div className="h-72 w-full animate-pulse rounded-xl bg-slate-100 sm:h-80 lg:h-96" />
            ) : (
              <leaflet.MapContainer
                key={`${mapCenter[0]}-${mapCenter[1]}-${response?.count ?? 0}`}
                center={mapCenter}
                zoom={12}
                className="h-72 w-full rounded-xl border border-brand/10 shadow-inner sm:h-80 lg:h-96"
                scrollWheelZoom
              >
                <leaflet.TileLayer
                  attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {response?.results.map((result) => {
                  const lat = result.pharmacyLatitude ?? response.latitude;
                  const lng = result.pharmacyLongitude ?? response.longitude;
                  return (
                    <leaflet.Marker key={result.pharmacyId} position={[lat, lng]}>
                      <leaflet.Popup>
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-slate-900">{result.medicineName}</p>
                          <p className="text-slate-700">{result.pharmacyName}</p>
                          <p className="text-xs text-slate-600">
                            Stock: {result.quantity} &bull; {result.distanceKm} km away
                            {result.unitPrice != null && result.unitPrice > 0 && ` &bull; ₹${result.unitPrice.toLocaleString("en-IN")}/unit`}
                          </p>
                        </div>
                      </leaflet.Popup>
                    </leaflet.Marker>
                  );
                })}
              </leaflet.MapContainer>
            )}
            {!hasResults && !loading && (
              <p className="text-center text-sm text-slate-500">Search for a medicine to see pharmacies on the map.</p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Package className="h-4 w-4 text-brand" />
              {response ? "Nearby Pharmacies" : "Results"}
            </h3>
            {hasResults && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Sort by</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void refetchWithSort("distance")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                      sortBy === "distance" ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Distance
                  </button>
                  <button
                    type="button"
                    onClick={() => void refetchWithSort("price")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                      sortBy === "price" ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Price
                  </button>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {response!.count} found
                </Badge>
              </div>
            )}
          </div>

          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <ResultSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && !response && (
            <Card className="rounded-2xl border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
              <CardContent className="flex flex-col p-6 sm:p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                  <Package className="h-8 w-8 text-brand" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Search results will appear here
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Enter a medicine name above, set your location, and hit Search. Pharmacies with stock will show up here with distance and availability.
                </p>
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Try searching for
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Paracetamol", "Amoxicillin", "Ibuprofen", "Cetirizine", "Metformin"].map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setQuery(name);
                          setShowSuggestions(false);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-slate-700">
                  <MapPin className="h-4 w-4 shrink-0 text-brand" />
                  <span>Use &quot;Use my location&quot; for accurate nearby results</span>
                </div>
              </CardContent>
            </Card>
          )}

          {emptyState && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-2xl border-dashed border-slate-300 bg-slate-50/50">
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <SearchX className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">No medicines found</p>
                  <p className="max-w-xs text-xs text-slate-500">
                    Try a different medicine name or increase your search radius to find more pharmacies.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!loading && hasResults && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
            >
              {response?.results.map((result) => (
                <motion.div
                    key={`${result.pharmacyId}-${result.medicineId}`}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                >
                  <Card className="card-hover rounded-2xl border-slate-200/80 bg-white">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-slate-900">{result.medicineName}</p>
                          <p className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{result.pharmacyName}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {result.pharmacyRating != null && (
                            <Badge variant="secondary" className="gap-0.5 text-amber-700">
                              <Star className="h-3 w-3 fill-amber-500" />
                              {result.pharmacyRating}
                              {result.pharmacyReviewCount != null && result.pharmacyReviewCount > 0 && (
                                <span className="text-slate-500">({result.pharmacyReviewCount})</span>
                              )}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                            <MapPin className="h-3 w-3" />
                            {result.distanceKm} km
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void toggleFavorite(result.pharmacyId); }}
                          disabled={togglingFavorite === result.pharmacyId}
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                          aria-label={favoriteIds.has(result.pharmacyId) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart
                            className={cn("h-4 w-4", favoriteIds.has(result.pharmacyId) && "fill-rose-500 text-rose-500")}
                          />
                        </button>
                      </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge className="gap-1.5 border border-brand/20 bg-brand/10 text-brand">
                          <Package className="h-3 w-3" />
                          In stock: {result.quantity}
                      </Badge>
                        {result.unitPrice != null && result.unitPrice > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            ₹{result.unitPrice.toLocaleString("en-IN")}/unit
                      </Badge>
                        )}
                    </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => void openDelivery(result)}
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Delivery
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-brand/30 text-xs text-brand hover:bg-brand/5 hover:text-brand"
                          onClick={() => void openReservation(result)}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Reserve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Delivery Dialog */}
      <Dialog open={deliveryOpen} onClose={() => setDeliveryOpen(false)}>
        {selectedResult && (
          <>
            <DialogHeader>
              <DialogTitle>{orderMode === "delivery" ? "Request Home Delivery" : "Reserve for Pickup"}</DialogTitle>
              <DialogDescription>
                {selectedResult.medicineName} from {selectedResult.pharmacyName}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={submitOrder}>
              <div className={cn("grid gap-3", orderMode === "delivery" ? "sm:grid-cols-2" : "")}>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="delivery-qty">
                      Quantity
                    </Label>
                    <Input
                      id="delivery-qty"
                      required
                      inputMode="numeric"
                      min={1}
                      value={deliveryQuantity}
                      onChange={(e) => setDeliveryQuantity(e.target.value)}
                    className="h-10 text-sm"
                    />
                  </div>
                {orderMode === "delivery" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="delivery-phone">
                      Contact phone
                    </Label>
                    <Input
                      id="delivery-phone"
                      inputMode="tel"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      placeholder="Optional"
                      className="h-10 text-sm"
                    />
                  </div>
                )}
                </div>

              {orderMode === "delivery" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="delivery-address">
                    Delivery address
                  </Label>
                  <Input
                    id="delivery-address"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House number, street, city"
                    className="h-10 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="delivery-notes">
                    Notes (optional)
                  </Label>
                  <Input
                    id="delivery-notes"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Landmark, drop-off instructions"
                  className="h-10 text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                  onClick={() => setDeliveryOpen(false)}
                  >
                    Cancel
                  </Button>
                <Button type="submit" disabled={deliveryLoading} className="gap-2 bg-brand px-5 text-white hover:bg-brand/90">
                  {orderMode === "delivery" ? <Truck className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                  {deliveryLoading ? "Sending..." : orderMode === "delivery" ? "Submit delivery request" : "Reserve"}
                  </Button>
                </div>
              </form>
          </>
        )}
      </Dialog>
    </section>
  );
}
