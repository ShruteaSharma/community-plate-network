import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import fallback from "@/assets/crate-fallback.jpg";
import { cn } from "@/lib/utils";

/** Renders a donation photo from the private bucket via a signed URL. */
export function DonationPhoto({
  path,
  alt,
  className,
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["photo", path],
    enabled: Boolean(path),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!path) return null;
      const { data } = await supabase.storage
        .from("donation-photos")
        .createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });

  return (
    <img
      src={data ?? fallback}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
    />
  );
}
