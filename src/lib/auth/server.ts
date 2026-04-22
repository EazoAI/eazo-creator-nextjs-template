import { EazoAuthServer } from "@eazo/auth";

/** Server-side auth instance. Requires EAZO_PRIVATE_KEY. */
export const authServer = new EazoAuthServer({
  privateKey: process.env.EAZO_PRIVATE_KEY!,
});
