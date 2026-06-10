import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ModuleDefinition } from "@/features/module-definition";

type ModulePlaceholderProps = {
  module: ModuleDefinition;
};

export function ModulePlaceholder({ module }: ModulePlaceholderProps) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge tone="success">Foundation ready</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">{module.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{module.summary}</p>
        </div>
        <p className="text-sm font-medium text-muted">{module.href}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Included scope</CardTitle>
            <CardDescription>
              Product capabilities prepared for this module.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {module.scope.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deferred from this foundation</CardTitle>
            <CardDescription>
              Implementation details intentionally left for Step 2.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {module.deferred.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
