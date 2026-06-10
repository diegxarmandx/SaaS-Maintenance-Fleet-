import type { PropsWithChildren } from "react";

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      {children}
    </main>
  );
}
