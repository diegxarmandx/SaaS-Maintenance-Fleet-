import Image from "next/image";
import { Camera } from "lucide-react";

import { cn } from "@/lib/utils";

type AssetPhotoProps = {
  src: string | null;
  alt: string;
  className?: string | undefined;
};

export function AssetPhoto({ src, alt, className }: AssetPhotoProps) {
  if (!src) {
    return (
      <div
        aria-label={`${alt} image missing`}
        className={cn(
          "flex aspect-square items-center justify-center rounded-lg border border-border bg-surface-muted text-muted",
          className,
        )}
        role="img"
      >
        <Camera aria-hidden="true" className="h-5 w-5" />
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={cn("aspect-square rounded-lg object-cover", className)}
      height={72}
      src={src}
      unoptimized
      width={72}
    />
  );
}
