#!/usr/bin/env node
/**
 * Checks the link previews in the built site (dist/client), the way Discord
 * reads them: the raw HTML of each route, no script run.
 *
 * - every route has its own title, description, canonical and og/twitter text
 * - Home, Features and Commands carry a component embed; Terms and Privacy don't
 * - each embed follows Discord's rules for component embeds: valid JSON under
 *   3,000 bytes, one Container (17) on top, no nested Container, at most 40
 *   components, link buttons only with only the allowed keys, absolute media
 *   URLs, at most 10 media items
 *
 * Run after `npm run build`:  node scripts/check-previews.js
 * Then paste each URL into Discord's Embed Debugger before merging.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "client");
const ROUTES = [
  { route: "", card: true },
  { route: "features", card: true },
  { route: "commands", card: true },
  { route: "terms", card: false },
  { route: "privacy", card: false },
];
const BUTTON_KEYS = new Set(["id", "type", "url", "style", "label", "emoji", "disabled"]);

const problems = [];
const fail = (msg) => problems.push(msg);

const tag = (html, re) => html.match(re)?.[1] ?? null;
const metaContent = (html, key, name) =>
  tag(html, new RegExp(`<meta ${key}="${name.replace(/[.:]/g, "\\$&")}" content="([^"]*)"`));

const seen = { title: new Map(), desc: new Map() };

for (const { route, card } of ROUTES) {
  const file = join(dist, route, "index.html");
  const html = readFileSync(file, "utf8");
  const where = `/${route}`;
  const url = `https://syntaxx.lol/${route}`;

  const title = tag(html, /<title>([^<]*)<\/title>/);
  const ogTitle = metaContent(html, "property", "og:title");
  const ogDesc = metaContent(html, "property", "og:description");
  if (!title || !ogTitle || !ogDesc) fail(`${where}: missing title or og tags`);
  if (metaContent(html, "property", "og:url") !== url) fail(`${where}: og:url is not ${url}`);
  if (tag(html, /<link rel="canonical" href="([^"]*)"/) !== url) fail(`${where}: canonical is not ${url}`);
  if (metaContent(html, "name", "twitter:title") !== ogTitle) fail(`${where}: twitter:title differs from og:title`);
  for (const [kind, value] of [["title", ogTitle], ["desc", ogDesc]]) {
    if (seen[kind].has(value)) fail(`${where}: same og ${kind} as /${seen[kind].get(value)}`);
    seen[kind].set(value, route);
  }
  if (new TextEncoder().encode(ogTitle ?? "").length > 70) fail(`${where}: og:title over Discord's 70 bytes`);
  if (new TextEncoder().encode(ogDesc ?? "").length > 350) fail(`${where}: og:description over Discord's 350 bytes`);

  const scripts = [...html.matchAll(/<script id="discord:component-embed" type="application\/json">([\s\S]*?)<\/script>/g)];
  if (!card) {
    if (scripts.length) fail(`${where}: should keep the plain preview, but has a component embed`);
    console.log(`${where.padEnd(10)} ${ogTitle}  (plain preview)`);
    continue;
  }
  if (scripts.length !== 1) { fail(`${where}: expected one component embed, found ${scripts.length}`); continue; }
  const raw = scripts[0][1];
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > 3000) fail(`${where}: component embed is ${bytes} bytes (limit 3,000)`);
  let payload;
  try { payload = JSON.parse(raw); } catch (e) { fail(`${where}: component embed isn't valid JSON (${e.message})`); continue; }

  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== "component") fail(`${where}: top level must be exactly { component }`);
  const top = payload.component;
  if (top?.type !== 17) fail(`${where}: top component must be a Container (17)`);

  let count = 0, media = 0;
  const visit = (c, depth) => {
    count++;
    if (c.type === 17 && depth > 0) fail(`${where}: a Container inside a Container`);
    if (c.type === 2) {
      if (c.style !== 5) fail(`${where}: button "${c.label}" isn't a link button`);
      for (const k of Object.keys(c)) if (!BUTTON_KEYS.has(k)) fail(`${where}: button "${c.label}" has key "${k}"`);
      if (!/^https:\/\//.test(c.url ?? "")) fail(`${where}: button "${c.label}" has no https url`);
    }
    if (c.type === 11) {
      media++;
      if (!/^https?:\/\//.test(c.media?.url ?? "")) fail(`${where}: thumbnail url isn't absolute`);
    }
    if (c.type === 12) media += c.items?.length ?? 0;
    for (const child of c.components ?? []) visit(child, depth + 1);
    if (c.accessory) visit(c.accessory, depth + 1);
  };
  visit(top, 0);
  if (count > 40) fail(`${where}: ${count} components (limit 40)`);
  if (media > 10) fail(`${where}: ${media} media items (limit 10)`);

  const texts = [];
  const collect = (c) => { if (c.type === 10) texts.push(c.content); (c.components ?? []).forEach(collect); if (c.accessory) collect(c.accessory); };
  collect(top);
  const buttons = [];
  const collectB = (c) => { if (c.type === 2) buttons.push(c.label); (c.components ?? []).forEach(collectB); };
  collectB(top);
  console.log(`${where.padEnd(10)} ${ogTitle}  (card, ${bytes} bytes, ${count} components)`);
  console.log(`           ${texts.join(" ¦ ").replace(/\n/g, " ⏎ ")}`);
  console.log(`           buttons: ${buttons.join(", ")}`);
}

if (problems.length) {
  console.error("\ncheck-previews failed:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("\ncheck-previews: all checks passed");
