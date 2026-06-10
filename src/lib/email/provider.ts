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

export function createTransactionalEmailProvider(): TransactionalEmailProvider {
  if (serverEnv.EMAIL_PROVIDER === "none") {
    return new UnconfiguredEmailProvider();
  }

  throw new AppError(
    "CONFIGURATION_ERROR",
    "Configured email provider is not implemented yet.",
  );
}
