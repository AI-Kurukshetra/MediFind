import type { Metadata } from "next";

import { PatientDashboardClient } from "./_components/patient-dashboard-client";

export const metadata: Metadata = {
  title: "MediFind | My Orders"
};

export default function PatientDashboardPage() {
  return (
    <main className="saas-page min-h-screen">
      <PatientDashboardClient />
    </main>
  );
}
