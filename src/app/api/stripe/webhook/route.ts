import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { processStripeWebhookEvent } from "@/features/billing/server/webhooks";
import { getStripeClient } from "@/features/billing/server/stripe";
import { serverEnv } from "@/lib/env/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      body,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const result = await processStripeWebhookEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
