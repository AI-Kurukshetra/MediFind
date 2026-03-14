import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="border-b border-slate-200/60 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <Skeleton className="h-10 w-72 sm:w-96" />
            <Skeleton className="h-5 w-80 sm:w-[28rem]" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-36" />
            </div>
          </div>
        </div>
      </section>

      {/* Search form skeleton */}
      <main className="saas-page space-y-8">
        <Card className="rounded-2xl">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-40 rounded-lg" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <Skeleton className="h-9 w-14 rounded-lg" />
                <Skeleton className="h-9 w-14 rounded-lg" />
                <Skeleton className="h-9 w-14 rounded-lg" />
                <Skeleton className="h-9 w-14 rounded-lg" />
              </div>
              <Skeleton className="h-11 w-28 rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Map + results skeleton */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <Card className="rounded-2xl">
            <CardHeader className="space-y-2 pb-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full rounded-xl sm:h-80 lg:h-96" />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-24 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-lg" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
