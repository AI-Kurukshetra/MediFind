import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      {/* Header skeleton */}
      <section className="border-b border-slate-200/60 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-6 sm:px-6 lg:px-10">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </section>

      <main className="saas-page space-y-8 pt-10">
        {/* Stats skeleton */}
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-5">
                <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="mt-2 h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-2xl">
            <CardHeader className="space-y-2 pb-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-11 w-full rounded-lg" />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Skeleton className="h-9 rounded-lg" />
                    <Skeleton className="h-9 rounded-lg" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-9 rounded-lg" />
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
