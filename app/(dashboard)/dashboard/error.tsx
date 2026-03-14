"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="saas-page flex items-center justify-center py-24">
      <Card className="w-full max-w-md rounded-2xl border-red-200/80 bg-white text-center">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Unable to load dashboard</h2>
            <p className="text-sm text-slate-500">
              Something went wrong while loading the pharmacy dashboard. Please try again.
            </p>
          </div>
          <Button variant="destructive" className="mt-2 gap-2" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
