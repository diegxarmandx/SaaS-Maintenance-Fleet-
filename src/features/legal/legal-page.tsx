import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LegalSection } from "@/features/legal/content";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalPage({
  eyebrow,
  title,
  description,
  lastUpdated,
  sections,
}: LegalPageProps) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 mb-8",
          })}
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to FleetReady
        </Link>

        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            {description}
          </p>
          <p className="mt-4 text-sm font-medium text-foreground">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="grid gap-4">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted">{section.body}</p>
                {section.bullets ? (
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                    {section.bullets.map((bullet) => (
                      <li className="flex gap-2" key={bullet}>
                        <span aria-hidden="true" className="text-primary">
                          -
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
