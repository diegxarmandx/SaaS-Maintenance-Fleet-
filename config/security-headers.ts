type SecurityHeader = {
  key: string;
  value: string;
};

type SecurityHeaderOptions = {
  nodeEnv?: string | undefined;
  supabaseUrl?: string | undefined;
};

type CspDirectives = Record<string, string[] | true>;

const supabaseStoragePattern = "https://*.supabase.co";
const cspSelf = "'self'";

export function buildSecurityHeaders(
  options: SecurityHeaderOptions = {},
): SecurityHeader[] {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";

  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({
        isProduction,
        supabaseUrl: options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
      }),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: buildPermissionsPolicy(),
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    ...(isProduction
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : []),
  ];
}

export function buildContentSecurityPolicy({
  isProduction,
  supabaseUrl,
}: {
  isProduction: boolean;
  supabaseUrl?: string | undefined;
}) {
  const supabaseOrigin = getOrigin(supabaseUrl);
  const approvedConnectOrigins = uniqueValues([
    supabaseOrigin,
    ...(isProduction ? [] : ["http://localhost:*", "http://127.0.0.1:*", "ws:"]),
  ]);
  const approvedStorageOrigins = uniqueValues([supabaseOrigin, supabaseStoragePattern]);

  const directives: CspDirectives = {
    "default-src": [cspSelf],
    "base-uri": [cspSelf],
    "object-src": [cspSelf, ...approvedStorageOrigins],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": [cspSelf],
    "script-src": [
      cspSelf,
      // Required by the current Next.js App Router hydration/Flight payloads
      // because this app does not yet issue CSP nonces from proxy middleware.
      "'unsafe-inline'",
      ...(isProduction ? [] : ["'unsafe-eval'"]),
    ],
    "style-src": [
      cspSelf,
      // Required for the current app's inline chart width styles and Next dev styles.
      "'unsafe-inline'",
    ],
    "img-src": [cspSelf, "data:", "blob:", ...approvedStorageOrigins],
    "font-src": [cspSelf, "data:"],
    "connect-src": [cspSelf, ...approvedConnectOrigins],
    "worker-src": [cspSelf, "blob:"],
    "manifest-src": [cspSelf],
    "media-src": [cspSelf, "blob:", ...approvedStorageOrigins],
    ...(isProduction ? { "upgrade-insecure-requests": true } : {}),
  };

  return Object.entries(directives)
    .map(([directive, sources]) =>
      sources === true ? directive : `${directive} ${uniqueValues(sources).join(" ")}`,
    )
    .join("; ");
}

function buildPermissionsPolicy() {
  const disabledFeatures = [
    "accelerometer",
    "autoplay",
    "camera",
    "display-capture",
    "encrypted-media",
    "fullscreen",
    "geolocation",
    "gyroscope",
    "magnetometer",
    "microphone",
    "midi",
    "payment",
    "picture-in-picture",
    "publickey-credentials-get",
    "screen-wake-lock",
    "usb",
    "web-share",
    "xr-spatial-tracking",
  ];

  return disabledFeatures.map((feature) => `${feature}=()`).join(", ");
}

function getOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
