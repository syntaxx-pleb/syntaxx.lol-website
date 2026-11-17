import React, { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import {
  Shield, ShieldCheck, Users, Coins, Wrench,
  Search, ExternalLink, ChevronRight, Terminal, X, Check, Copy,
} from "lucide-react";
import { INVITE_URL } from "@/config";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { useIsMobile } from "@/hooks/use-media-query";
import data from "@/data/features.json";
import {
  PAGE, SURFACE, BORDER, BORDER_SUBTLE,
  TEXT, MUTED, SUBTLE, GOLD, HUE, ORANGE, RED, BLURPLE,
  RADIUS, LAYOUT, FONT_MONO, GOLD_GRADIENT, alpha,
} from "@/theme";

/*
 * The catalogue is generated, not written by hand (decided 2026-11-18).
 * web/src/data/features.json comes from the bot repo's features/build.js
 * --public, which reads the bot's real commands: every public command sits in
 * exactly one feature, with its own description, options and the Discord
 * permission it needs. A hand-written list here had drifted to 65 commands
 * the bot no longer has; this one can't.
 */

type Kind = "slash" | "prefix" | "user-context" | "message-context";
type AreaId = "moderation" | "protection" | "community" | "levels-casino" | "tools";

interface CommandOption { name: string; required: boolean }
interface FeatureCommand {
  name: string; kind: Kind; description: string; permissions: string[];
  aliases: string[]; options: CommandOption[]; copy: string;
}
interface Feature { id: string; name: string; area: AreaId | null; commands: FeatureCommand[] }

const AREAS: { id: AreaId; label: string; color: string; icon: React.ReactNode }[] = [
  { id: "moderation",    label: "Moderation",      color: HUE.moderation, icon: <Shield size={15} /> },
  { id: "protection",    label: "Protection",      color: HUE.setup,      icon: <ShieldCheck size={15} /> },
  { id: "community",     label: "Community",       color: BLURPLE,        icon: <Users size={15} /> },
  { id: "levels-casino", label: "Levels & casino", color: HUE.casino,     icon: <Coins size={15} /> },
  { id: "tools",         label: "Tools",           color: HUE.leveling,   icon: <Wrench size={15} /> },
];
const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, (typeof AREAS)[number]>;

/** Features with commands, in area order, then in the Features page's order. */
const SECTIONS = (data.features as Feature[])
  .filter((f) => f.commands.length > 0 && f.area && AREA_BY_ID[f.area])
  .sort((a, b) => AREAS.findIndex((x) => x.id === a.area) - AREAS.findIndex((x) => x.id === b.area));

const ALL_COMMANDS = SECTIONS.flatMap((f) => f.commands);
const COUNT = {
  total: ALL_COMMANDS.length,
  slash: ALL_COMMANDS.filter((c) => c.kind === "slash").length,
  rightClick: ALL_COMMANDS.filter((c) => c.kind === "user-context" || c.kind === "message-context").length,
  prefix: ALL_COMMANDS.filter((c) => c.kind === "prefix").length,
};

const ALL_ID = "all";
const isRightClick = (c: FeatureCommand) => c.kind === "user-context" || c.kind === "message-context";
const shownName = (c: FeatureCommand) => (isRightClick(c) ? c.name.replace(/^ctx:/, "") : c.name);

/** How to type it: the name with its options, <required> and [optional]. */
function usage(c: FeatureCommand): string | null {
  if (isRightClick(c)) return null;
  const opts = c.options.map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`));
  return [c.name, ...opts].join(" ");
}

/**
 * Tags are colour-coded, but colour is never the only signal: each one also
 * carries its own word, for readers who can't tell red from orange.
 */
function Tag({ label, color, mono }: { label: string; color: string; mono?: boolean }) {
  return (
    <span
      style={{
        fontSize: mono ? 12 : 10, fontWeight: mono ? 600 : 700, letterSpacing: mono ? 0 : "0.05em",
        backgroundColor: alpha(color, 0.12), color,
        border: `1px solid ${alpha(color, 0.28)}`,
        borderRadius: RADIUS.sm, padding: "2px 6px", whiteSpace: "nowrap",
        fontFamily: mono ? FONT_MONO : "inherit",
      }}
    >
      {label}
    </span>
  );
}

/** Copies what you'd type into Discord: "/softban", "/clear amount: reason:". */
function CopyButton({ text, name }: { text: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      aria-label={copied ? `Copied ${name}` : `Copy ${name}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
        background: "none", border: `1px solid ${BORDER}`, borderRadius: RADIUS.sm,
        color: copied ? HUE.leveling : MUTED, fontSize: 11, fontFamily: "inherit",
        padding: "2px 7px", cursor: "pointer",
      }}
    >
      {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CommandCard({ cmd, color }: { cmd: FeatureCommand; color: string }) {
  const how = usage(cmd);
  const name = shownName(cmd);
  return (
    <li
      className="card-lift"
      style={{
        backgroundColor: SURFACE,
        border: `1px solid ${cmd.kind === "prefix" ? alpha(ORANGE, 0.2) : BORDER}`,
        borderRadius: RADIUS.lg,
        padding: "15px 16px",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
        {isRightClick(cmd) && <Tag label="RIGHT-CLICK" color={HUE.context} />}
        <code
          style={{
            fontSize: 12.5, fontWeight: 700,
            color: cmd.kind === "prefix" ? ORANGE : isRightClick(cmd) ? TEXT : color,
            backgroundColor: isRightClick(cmd) ? "transparent" : alpha(cmd.kind === "prefix" ? ORANGE : color, 0.11),
            padding: isRightClick(cmd) ? 0 : "3px 8px", borderRadius: RADIUS.sm,
            fontFamily: isRightClick(cmd) ? "inherit" : FONT_MONO, wordBreak: "break-word",
          }}
        >
          {name}
        </code>
        {cmd.permissions.map((p) => <Tag key={p} label={p.toUpperCase()} color={RED} />)}
      </div>
      <p style={{ color: MUTED, fontSize: 13.5, margin: 0, lineHeight: 1.55 }}>{cmd.description}</p>
      {cmd.aliases.length > 0 && (
        <p style={{ color: SUBTLE, fontSize: 12, margin: "6px 0 0" }}>
          Also: {cmd.aliases.map((a) => `taxx!${a}`).join(", ")}
        </p>
      )}
      {how && (
        <div style={{ marginTop: "auto", paddingTop: 9, display: "flex", alignItems: "flex-start", gap: 6 }}>
          <ChevronRight size={12} color={SUBTLE} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          {/* The one line that tells you how to type the command, so it keeps
              a readable contrast (it was once #555 on #1e1e1e). */}
          <code style={{ fontSize: 11.5, color: SUBTLE, fontFamily: FONT_MONO, lineHeight: 1.5, wordBreak: "break-word", flex: 1 }}>
            {how}
          </code>
          <CopyButton text={cmd.copy} name={cmd.name} />
        </div>
      )}
    </li>
  );
}

export default function Commands() {
  const [activeArea, setActiveArea] = useState<string>(ALL_ID);
  const [query, setQuery] = useState("");
  const isMobile = useIsMobile();
  const still = useReducedMotion();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SECTIONS
      .filter((f) => activeArea === ALL_ID || f.area === activeArea)
      .map((f) => ({
        ...f,
        commands: f.commands.filter((c) =>
          !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
          || f.name.toLowerCase().includes(q)),
      }))
      .filter((f) => f.commands.length > 0);
  }, [activeArea, query]);

  /** How many commands survived the current filter, for the live region. */
  const resultCount = useMemo(() => filtered.reduce((a, f) => a + f.commands.length, 0), [filtered]);
  const gutter = isMobile ? LAYOUT.gutterMobile : LAYOUT.gutter;

  return (
    <div style={PAGE}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav current="commands" />

      <main id="main" style={{ maxWidth: LAYOUT.maxWidth, margin: "0 auto", padding: `${isMobile ? 48 : 72}px ${gutter}px 0` }}>
        <motion.div
          initial={still ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={still ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: still ? 0.2 : 0.5 }}
        >
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 44 }}>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                backgroundColor: alpha(GOLD, 0.09),
                border: `1px solid ${alpha(GOLD, 0.26)}`,
                borderRadius: RADIUS.pill, padding: "6px 15px", marginBottom: 20,
                fontSize: 12.5, color: GOLD, fontWeight: 600, flexWrap: "wrap", justifyContent: "center",
              }}
            >
              <Terminal size={12} aria-hidden="true" />
              {COUNT.total} commands — {COUNT.slash} slash · {COUNT.rightClick} right-click · {COUNT.prefix} taxx!
            </div>
            <h1 style={{ fontSize: isMobile ? 34 : 52, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.035em", color: TEXT }}>
              All{" "}
              <span
                style={{
                  background: GOLD_GRADIENT,
                  WebkitBackgroundClip: "text", backgroundClip: "text",
                  WebkitTextFillColor: "transparent", color: GOLD,
                }}
              >
                Commands
              </span>
            </h1>
            <p style={{ color: MUTED, fontSize: 16, margin: "0 auto", maxWidth: 540, lineHeight: 1.6 }}>
              Every command syntaxx answers to, grouped by what it's for. Straight from the bot, so this list is always current.
            </p>
          </div>

          {/* ── Legend ──────────────────────────────────────────── */}
          <ul style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 24, padding: 0, listStyle: "none" }}>
            {[
              { chip: "/slash",          color: HUE.setup,   mono: true,  text: "Slash command" },
              { chip: "RIGHT-CLICK",     color: HUE.context, mono: false, text: "Right-click › Apps" },
              { chip: "taxx!",           color: ORANGE,      mono: true,  text: "Text command" },
              { chip: "MANAGE MESSAGES", color: RED,         mono: false, text: "Discord permission it needs" },
            ].map((l) => (
              <li key={l.chip} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: MUTED }}>
                <Tag label={l.chip} color={l.color} mono={l.mono} />
                {l.text}
              </li>
            ))}
          </ul>

          {/* ── Search ──────────────────────────────────────────── */}
          <div style={{ position: "relative", maxWidth: 480, margin: "0 auto 28px" }}>
            <Search size={16} color={SUBTLE} aria-hidden="true" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <label htmlFor="command-search" className="sr-only">Search commands</label>
            <input
              id="command-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands…"
              style={{
                width: "100%", boxSizing: "border-box", backgroundColor: SURFACE,
                border: `1px solid ${BORDER}`, borderRadius: RADIUS.md,
                padding: "12px 38px 12px 40px", color: TEXT, fontSize: 14,
                outline: "none", fontFamily: "inherit",
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: SUBTLE, cursor: "pointer",
                  display: "flex", alignItems: "center", padding: 6, borderRadius: RADIUS.sm,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtering changes the list without a reload or a focus change, so
              screen-reader users hear the new count. */}
          <p aria-live="polite" className="sr-only">
            {resultCount} command{resultCount === 1 ? "" : "s"} shown
          </p>

          {/* ── Area chips ──────────────────────────────────────── */}
          <div
            role="group"
            aria-label="Filter commands by area"
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 40 }}
          >
            {[{ id: ALL_ID, label: "All", color: TEXT, icon: null as React.ReactNode }, ...AREAS].map((area) => {
              const isActive = activeArea === area.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  className="chip"
                  onClick={() => setActiveArea(area.id)}
                  // A pressed toggle, not a link: aria-pressed tells a screen
                  // reader which filter is applied.
                  aria-pressed={isActive}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 13px", borderRadius: RADIUS.md, fontSize: 12.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    backgroundColor: isActive ? alpha(area.color, 0.14) : "rgba(255,255,255,0.04)",
                    color: isActive ? area.color : MUTED,
                    border: `1px solid ${isActive ? alpha(area.color, 0.4) : "transparent"}`,
                  }}
                >
                  {area.icon}
                  {area.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Command list ─────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: MUTED }}>
            <Terminal size={32} color={SUBTLE} aria-hidden="true" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, margin: "0 0 20px" }}>
              No commands match “<strong style={{ color: TEXT }}>{query}</strong>”
              {activeArea !== ALL_ID && <> in this area</>}.
            </p>
            {/* No dead end: one button undoes whatever hid everything. */}
            <button
              type="button"
              className="sx-btn sx-btn--ghost sx-btn--sm"
              onClick={() => { setQuery(""); setActiveArea(ALL_ID); }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
            {filtered.map((f, fi) => {
              const area = AREA_BY_ID[f.area as AreaId];
              return (
                <motion.section
                  key={f.id}
                  aria-labelledby={`feat-${f.id}`}
                  initial={still ? { opacity: 0 } : { opacity: 0, y: 16 }}
                  animate={still ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(fi, 6) * 0.03 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    <div
                      aria-hidden="true"
                      style={{
                        backgroundColor: alpha(area.color, 0.13),
                        border: `1px solid ${alpha(area.color, 0.22)}`,
                        borderRadius: RADIUS.sm, padding: "6px 8px",
                        display: "flex", alignItems: "center", color: area.color,
                      }}
                    >
                      {area.icon}
                    </div>
                    <h2 id={`feat-${f.id}`} style={{ fontSize: 14, fontWeight: 700, color: area.color, margin: 0, letterSpacing: "-0.01em" }}>
                      {f.name}
                    </h2>
                    <span style={{ fontSize: 12.5, color: SUBTLE, fontWeight: 500, whiteSpace: "nowrap" }}>
                      {f.commands.length} command{f.commands.length !== 1 ? "s" : ""}
                    </span>
                    <div aria-hidden="true" style={{ flex: 1, height: 1, backgroundColor: BORDER_SUBTLE, minWidth: 12 }} />
                    <Link
                      href={`/features#${f.id}`}
                      style={{ fontSize: 12.5, color: GOLD, textDecoration: "none", whiteSpace: "nowrap" }}
                      aria-label={`About ${f.name}, on the Features page`}
                    >
                      About this feature →
                    </Link>
                  </div>

                  <ul
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(330px, 1fr))",
                      gap: 10, margin: 0, padding: 0, listStyle: "none",
                    }}
                  >
                    {f.commands.map((c) => <CommandCard key={c.name} cmd={c} color={area.color} />)}
                  </ul>
                </motion.section>
              );
            })}
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section
          style={{
            marginTop: 72, marginBottom: 24, textAlign: "center",
            padding: isMobile ? "36px 22px" : "52px 32px",
            background: `linear-gradient(135deg, ${alpha(GOLD, 0.1)} 0%, ${alpha(GOLD, 0.03)} 100%)`,
            border: `1px solid ${alpha(GOLD, 0.22)}`,
            borderRadius: RADIUS.xl,
          }}
        >
          <h2 style={{ fontSize: isMobile ? 23 : 29, fontWeight: 800, margin: "0 0 10px", color: TEXT, letterSpacing: "-0.03em" }}>
            Ready to get started?
          </h2>
          <p style={{ color: MUTED, fontSize: 15, margin: "0 0 26px" }}>
            Invite Syntaxx to your server and unlock all {COUNT.total} commands.
          </p>
          <a
            href={INVITE_URL}
            target="_blank"
            rel="noreferrer"
            className="sx-btn sx-btn--primary"
            aria-label="Invite Syntaxx to your Discord server (opens in a new tab)"
          >
            Invite Syntaxx <ExternalLink size={15} aria-hidden="true" />
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
