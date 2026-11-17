/**
 * What Discord (and other apps) show when a syntaxx.lol link is pasted.
 *
 * Link previews are read from the page's HTML once, without running any
 * script, and every route is a copy of the same index.html shell
 * (vite.config.ts → staticRoutes). Without this, /features and /commands
 * previewed as the home page. At build time each route's copy gets:
 *
 * - its own <title>, description, canonical, og:* and twitter:* text, and
 * - for Home, Features and Commands, a Discord "component embed": a
 *   Components V2 card drawn in place of the plain preview. The plain tags
 *   stay as the fallback when a card fails to unfurl.
 *
 * Component embeds (docs.discord.com/developers/link-previews/component-embeds):
 * one Container (type 17) at the top, at most 40 components, at most 3,000
 * bytes of JSON, link buttons (style 5) only, media URLs absolute. Discord
 * caches a preview for about 30 minutes. Check a change with the Embed
 * Debugger (discord.com/developers/embeds) before it ships.
 *
 * Approved demo, boards 8–10: https://claude.ai/artifact/XFE7VkoXC9KVWZXeddZ7ej
 */
import featuresData from "./data/features.json";
import { stat } from "./data/stats";
import { GOLD } from "./theme";

export const ORIGIN = "https://syntaxx.lol";
export const MAX_EMBED_BYTES = 3000;

export type Route = "" | "features" | "commands" | "terms" | "privacy";

interface PageText {
  title: string;
  /** og/twitter description, and the meta description unless `meta` is set */
  description: string;
  meta?: string;
}

/** The home page keeps the tags already in index.html. */
const PAGES: Record<Exclude<Route, "">, PageText> = {
  features: {
    title: "Features · Syntaxx",
    description: "Everything syntaxx does, shown the way it looks in your server. New features are tried in Beta first.",
  },
  commands: {
    title: "Commands · Syntaxx",
    description: `All ${stat("Commands")} commands across ${stat("Features")} features, with what each one does and the permission it needs.`,
  },
  terms: {
    title: "Terms of Service · Syntaxx",
    description: "The rules for inviting syntaxx and using syntaxx.lol.",
  },
  privacy: {
    title: "Privacy Policy · Syntaxx",
    description: "What syntaxx stores about you and your server, what it doesn't, and how long it keeps it.",
  },
};

const accent = parseInt(GOLD.slice(1), 16);

const linkButton = (label: string, url: string) => ({ type: 2, style: 5, label, url });
const text = (content: string) => ({ type: 10, content });

interface Feature { name: string; status: string }

function featureCard() {
  const features = (featuresData as { features: Feature[] }).features;
  const count = (status: string) => features.filter((f) => f.status === status).length;
  // The page's order: Stable, then Beta, then Planned, each in file order.
  const ordered = ["stable", "beta", "planned"].flatMap((s) => features.filter((f) => f.status === s));
  const named = ordered.slice(0, 5).map((f) => f.name);
  const more = features.length - named.length;
  const list = more > 0 ? `${named.join(", ")} and ${more} more.` : `${named.join(", ")}.`;
  return {
    type: 17,
    accent_color: accent,
    components: [
      text(
        "-# FEATURES\n## Everything syntaxx does\n" +
        `**${count("stable")}** stable · **${count("beta")}** in beta · **${count("planned")}** planned. ${list}`,
      ),
      { type: 1, components: [linkButton("See all features", `${ORIGIN}/features`)] },
    ],
  };
}

function commandsCard() {
  return {
    type: 17,
    accent_color: accent,
    components: [
      text(
        "-# COMMANDS\n## All commands\n" +
        `**${stat("Commands")}** commands across **${stat("Features")}** features, ` +
        "from moderation and softbans to levels, casino and tools.",
      ),
      { type: 1, components: [linkButton("Browse commands", `${ORIGIN}/commands`)] },
    ],
  };
}

function homeCard(invite: string) {
  return {
    type: 17,
    accent_color: accent,
    components: [
      {
        type: 9,
        components: [
          text("# Syntaxx\nThe Belgian Discord bot for moderation, economy, leveling and auto-mod. Free, with every feature included."),
        ],
        accessory: {
          type: 11,
          media: { url: `${ORIGIN}/syntaxx-logo.png` },
          description: "The Syntaxx logo: a gold and a platinum diamond overlapping on a black tile.",
        },
      },
      { type: 14, divider: true, spacing: 1 },
      text(
        `**${stat("Commands")}** commands · **${stat("Features")}** features · ` +
        `**${stat("Every feature")}**, every feature`,
      ),
      { type: 14, divider: true, spacing: 1 },
      {
        type: 1,
        components: [
          linkButton("Add to Discord", invite),
          linkButton("Features", `${ORIGIN}/features`),
          linkButton("Commands", `${ORIGIN}/commands`),
        ],
      },
    ],
  };
}

/** The component-embed payload for a route, or null for a plain preview. */
export function componentEmbed(route: Route, invite: string): { component: object } | null {
  if (route === "") return { component: homeCard(invite) };
  if (route === "features") return { component: featureCard() };
  if (route === "commands") return { component: commandsCard() };
  return null;
}

/**
 * The JSON as it goes in the page. "<" is escaped so the text can't close the
 * script tag; Discord counts escapes at full length, so this is what's measured.
 */
export function embedJson(payload: object): string {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > MAX_EMBED_BYTES) {
    throw new Error(`Discord component embed is ${bytes} bytes; the limit is ${MAX_EMBED_BYTES}.`);
  }
  return json;
}

const attr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Replaces exactly one match, so a changed index.html fails the build loudly. */
function replaceOnce(html: string, pattern: RegExp, replacement: string, what: string): string {
  const matches = html.match(new RegExp(pattern.source, "g"));
  if (!matches || matches.length !== 1) {
    throw new Error(`linkPreviews: expected one ${what} in index.html, found ${matches?.length ?? 0}`);
  }
  return html.replace(pattern, () => replacement);
}

/** The index.html shell, with this route's preview tags. */
export function withPreview(shell: string, route: Route, invite: string): string {
  let html = shell;
  if (route !== "") {
    const page = PAGES[route];
    const url = `${ORIGIN}/${route}`;
    const meta = (key: "name" | "property", name: string, content: string) =>
      replaceOnce(
        html,
        new RegExp(`<meta ${key}="${name}" content="[^"]*"\\s*/?>`),
        `<meta ${key}="${name}" content="${attr(content)}" />`,
        `${name} tag`,
      );
    html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${attr(page.title)}</title>`, "<title>");
    html = meta("name", "description", page.meta ?? page.description);
    html = replaceOnce(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`, "canonical link");
    html = meta("property", "og:url", url);
    html = meta("property", "og:title", page.title);
    html = meta("property", "og:description", page.description);
    html = meta("name", "twitter:title", page.title);
    html = meta("name", "twitter:description", page.description);
  }
  const payload = componentEmbed(route, invite);
  if (payload) {
    html = replaceOnce(
      html,
      /<\/head>/,
      `  <script id="discord:component-embed" type="application/json">${embedJson(payload)}</script>\n  </head>`,
      "</head>",
    );
  }
  return html;
}
