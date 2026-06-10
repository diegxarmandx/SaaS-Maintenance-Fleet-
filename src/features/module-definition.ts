export type ModuleHref =
  | "/dashboard"
  | "/fleet"
  | "/maintenance"
  | "/compliance"
  | "/documents"
  | "/reports"
  | "/settings";

export type ModuleDefinition = Readonly<{
  title: string;
  href: ModuleHref;
  summary: string;
  scope: readonly string[];
  deferred: readonly string[];
}>;
