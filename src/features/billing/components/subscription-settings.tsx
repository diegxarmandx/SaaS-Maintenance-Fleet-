import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Lock,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatSubscriptionStatus,
  getSubscriptionCapabilities,
} from "@/features/billing/access";
import { subscriptionPlans } from "@/features/billing/plans";
import {
  openStripeBillingPortalAction,
  startStripeCheckoutAction,
} from "@/features/billing/server/actions";
import { isStripeCheckoutConfigured } from "@/features/billing/server/stripe";
import type { SubscriptionSnapshot } from "@/features/billing/types";
import { formatShortDate } from "@/features/fleet/helpers";

type SubscriptionSettingsProps = {
  snapshot: SubscriptionSnapshot;
};

export function SubscriptionSettings({ snapshot }: SubscriptionSettingsProps) {
  const capabilities = getSubscriptionCapabilities({
    status: snapshot.status,
    activeAssetCount: snapshot.activeAssetCount,
    assetLimit: snapshot.assetLimit,
  });
  const checkoutConfigured = isStripeCheckoutConfigured();
  const currentPlanKey = snapshot.record?.plan_key ?? null;
  const statusLabel = formatSubscriptionStatus(snapshot.status);
  const badgeStatus =
    snapshot.status === "active" ||
    snapshot.status === "trial" ||
    snapshot.status === "trialing"
      ? "Active"
      : snapshot.status === "past_due" || snapshot.status === "unpaid"
        ? "Past due"
        : snapshot.status === "canceled"
          ? "Canceled"
          : "Read-only";

  return (
    <section
      id="subscription"
      className="grid gap-4"
      aria-labelledby="subscription-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Subscription and billing</p>
          <h2
            id="subscription-title"
            className="mt-1 text-xl font-semibold text-foreground"
          >
            Active-asset plan
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Plans are based on active assets, not user seats. Archived assets remain
            available and do not count toward the active limit.
          </p>
        </div>
        {snapshot.record?.stripe_customer_id ? (
          <form action={openStripeBillingPortalAction}>
            <button className={buttonClassName({ variant: "secondary" })} type="submit">
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Billing portal
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-3">
          {subscriptionPlans.map((plan) => {
            const isCurrentPlan = currentPlanKey === plan.key;
            const isConfigured = Boolean(plan.stripePriceId) && checkoutConfigured;

            return (
              <Card
                className={plan.highlight ? "border-primary/40 shadow-md" : undefined}
                key={plan.key}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                    {isCurrentPlan ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      </span>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-foreground">
                    {plan.assetLimit}
                    <span className="ml-1 text-sm font-medium text-muted">assets</span>
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Suggested range: {plan.suggestedMonthlyPrice}
                  </p>
                  <form action={startStripeCheckoutAction} className="mt-4">
                    <input name="planKey" type="hidden" value={plan.key} />
                    <button
                      className={buttonClassName({
                        variant: isCurrentPlan ? "secondary" : "primary",
                        className: "w-full",
                      })}
                      disabled={!isConfigured}
                      type="submit"
                    >
                      <CreditCard aria-hidden="true" className="h-4 w-4" />
                      {isCurrentPlan ? "Change in Stripe" : "Choose plan"}
                    </button>
                  </form>
                  {!isConfigured ? (
                    <p className="mt-3 flex gap-2 text-xs leading-5 text-muted">
                      <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Configure Stripe test keys, webhook secret, and price IDs to enable
                      Checkout.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Current status</CardTitle>
              <StatusBadge status={badgeStatus} />
            </div>
            <CardDescription>{statusLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Active assets</dt>
                <dd className="font-medium text-foreground">
                  {snapshot.activeAssetCount} / {snapshot.assetLimit}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Remaining</dt>
                <dd className="font-medium text-foreground">
                  {capabilities.remainingActiveAssets}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Period end</dt>
                <dd className="font-medium text-foreground">
                  {formatShortDate(snapshot.record?.current_period_end ?? null)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Canceling</dt>
                <dd className="font-medium text-foreground">
                  {snapshot.record?.cancel_at_period_end ? "At period end" : "No"}
                </dd>
              </div>
            </dl>
            {capabilities.reason ? (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">
                <div className="flex gap-2">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  />
                  <p>{capabilities.reason}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
