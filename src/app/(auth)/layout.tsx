import type { PropsWithChildren } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
      <aside className="hidden bg-navy px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="text-xl font-semibold">Maintly</span>
          </div>
          <h2 className="mt-16 max-w-md text-3xl font-semibold leading-tight">
            Keep every unit serviced, documented, and ready.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            A focused owner workspace for preventive maintenance, compliance, documents,
            reminders, and fleet costs.
          </p>
        </div>
        <ul className="grid gap-3 text-sm text-slate-200">
          <AuthBenefit>Owner-only fleet workspace</AuthBenefit>
          <AuthBenefit>Private company and asset records</AuthBenefit>
          <AuthBenefit>No dispatch, driver, or shop clutter</AuthBenefit>
        </ul>
      </aside>
      <div className="flex min-w-0 items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </div>
    </main>
  );
}

function AuthBenefit({ children }: PropsWithChildren) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-teal-300" />
      {children}
    </li>
  );
}
