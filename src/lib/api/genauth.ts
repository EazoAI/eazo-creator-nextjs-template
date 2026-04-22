export interface SocialConnection {
  id: string;
  provider: string;
  identifier: string;
  name: string;
  name_en: string;
  tooltip: { "zh-CN": string; "en-US": string };
  tagsStatus: boolean;
}

export interface GenAuthPublicConfig {
  socialConnections: SocialConnection[];
}

export async function fetchGenAuthPublicConfig(): Promise<GenAuthPublicConfig> {
  const domain =
    process.env.NEXT_PUBLIC_GENAUTH_APP_DOMAIN ??
    process.env.NEXT_PUBLIC_AUTHING_APP_DOMAIN;
  const appId =
    process.env.NEXT_PUBLIC_GENAUTH_APP_ID ??
    process.env.NEXT_PUBLIC_AUTHING_APP_ID;

  if (!domain || !appId) {
    console.warn("GenAuth env vars not set, returning empty social connections");
    return { socialConnections: [] };
  }

  const res = await fetch(
    `${domain}/api/v2/applications/${appId}/public-config`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok)
    throw new Error(`Failed to fetch GenAuth public config: ${res.status}`);
  const json = await res.json();
  return json.data as GenAuthPublicConfig;
}
