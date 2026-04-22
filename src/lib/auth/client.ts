import { EazoAuthClient } from "@eazo/auth";

/** Browser-side auth singleton. No private key needed. */
export const auth = new EazoAuthClient({
  publicKey: process.env.NEXT_PUBLIC_EAZO_PUBLIC_KEY!,
});
