export type SupportContact = {
  configured: boolean;
  email: string | null;
  mailtoHref: string | null;
  statusMessage: string;
};

export function getSupportContact(supportEmail: string | undefined): SupportContact {
  if (!supportEmail) {
    return {
      configured: false,
      email: null,
      mailtoHref: null,
      statusMessage:
        "Support email is not configured yet. Configure SUPPORT_EMAIL before production support intake is enabled.",
    };
  }

  return {
    configured: true,
    email: supportEmail,
    mailtoHref: `mailto:${supportEmail}`,
    statusMessage: "Support requests should be sent from the owner account email.",
  };
}
