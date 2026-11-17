/**
 * Public, build-time configuration.
 *
 * The Discord application id is not a secret — it is visible in every invite
 * link and was already in wrangler.jsonc, which is public in this repo. It
 * lives here rather than in an environment variable because a static build has
 * no server to read one from: VITE_DISCORD_CLIENT_ID was never set in CI, so
 * the invite button silently pointed at "YOUR_CLIENT_ID" and did nothing.
 *
 * The env var still wins if it is set, which keeps a fork working without an
 * edit here.
 */
// The default id and the link's shape live in discordApp.ts, so the Discord
// link preview written at build time (linkPreviews.ts) uses the same invite.
import { DEFAULT_DISCORD_CLIENT_ID, inviteUrl } from "./discordApp";

export const DISCORD_CLIENT_ID =
  import.meta.env.VITE_DISCORD_CLIENT_ID ?? DEFAULT_DISCORD_CLIENT_ID;

export const INVITE_URL = inviteUrl(DISCORD_CLIENT_ID);
