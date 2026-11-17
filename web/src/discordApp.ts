/**
 * The syntaxx Discord application and its invite link.
 *
 * Shared by config.ts (the app, which can read import.meta.env) and
 * linkPreviews.ts (run by vite.config.ts at build time, which can't), so the
 * invite in a Discord link preview is always the one the site's buttons use.
 */

// Verify before changing this. A wrong id does not fail loudly — Discord's
// authorize page just refuses, which is how "1358071643238563932" (from
// wrangler.jsonc, and an application that does not exist) shipped:
//
//     curl https://discord.com/api/v10/applications/<id>/rpc
//
// should return {"name":"syntaxx", ...}, not {"message":"Unknown Application"}.
export const DEFAULT_DISCORD_CLIENT_ID = "1055141641679290378";

/** `permissions=8` is Administrator, which is what the bot's setup expects. */
export function inviteUrl(clientId: string): string {
  return (
    `https://discord.com/oauth2/authorize?client_id=${clientId}` +
    `&permissions=8&scope=bot%20applications.commands`
  );
}
