import { AppError } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";

export type EmailAddress = {
  email: string;
  name?: string;
};

export type TransactionalEmailMessage = {
  to: EmailAddress;
  subject: string;
  text: string;
  html?: string;
};

export type EmailDeliveryResult = {
  provider: string;
  messageId: string;
};

export interface TransactionalEmailProvider {
  send(message: TransactionalEmailMessage): Promise<EmailDeliveryResult>;
}

class UnconfiguredEmailProvider implements TransactionalEmailProvider {
  async send(): Promise<EmailDeliveryResult> {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Transactional email provider is not configured.",
    );
  }
}

class ResendEmailProvider implements TransactionalEmailProvider {
  async send(message: TransactionalEmailMessage): Promise<EmailDeliveryResult> {
    if (!serverEnv.RESEND_API_KEY || !serverEnv.EMAIL_FROM) {
      throw new AppError(
        "CONFIGURATION_ERROR",
        "Resend email provider requires RESEND_API_KEY and EMAIL_FROM.",
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.EMAIL_FROM,
        to: [
          message.to.name ? `${message.to.name} <${message.to.email}>` : message.to.email,
        ],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      id?: string;
      message?: string;
    } | null;

    if (!response.ok) {
      throw new AppError(
        "DATA_ACCESS_ERROR",
        payload?.message ?? "Resend email delivery failed.",
      );
    }

    return {
      provider: "resend",
      messageId: payload?.id ?? crypto.randomUUID(),
    };
  }
}

export function createTransactionalEmailProvider(): TransactionalEmailProvider {
  if (serverEnv.EMAIL_PROVIDER === "none") {
    return new UnconfiguredEmailProvider();
  }

  return new ResendEmailProvider();
}
