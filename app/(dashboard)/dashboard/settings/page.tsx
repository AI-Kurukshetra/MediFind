import { Settings } from "lucide-react";

export const metadata = {
  title: "MediFind | Settings",
};

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your pharmacy settings</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Settings className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">Settings coming soon</p>
        <p className="max-w-xs text-center text-xs text-slate-500">
          Configure pharmacy profile, notifications, and preferences here.
        </p>
      </div>
    </div>
  );
}
