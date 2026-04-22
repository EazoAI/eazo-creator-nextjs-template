"use client";

import { useEffect, useState } from "react";
import { fetchGenAuthPublicConfig, type SocialConnection } from "@/lib/api";

export function useSocialConnections() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGenAuthPublicConfig()
      .then((cfg) => setConnections(cfg.socialConnections.filter((c) => c.tagsStatus)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { connections, loading };
}
