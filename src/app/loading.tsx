export default function Loading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-surface-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-36 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-36 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-36 animate-pulse rounded-lg bg-surface-muted" />
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </main>
  );
}
