/**
 * Claims the home page's hero makes concrete, also used by the Discord link
 * previews (linkPreviews.ts).
 *
 * Both come from web/src/data/features.json, the generated catalogue the
 * Commands and Features pages are built from (decided 2026-11-18). They're
 * written out rather than imported: features.json carries every feature's
 * scene markup, and importing it here would pull it into the landing page's
 * bundle and undo the code-split App.tsx sets up deliberately.
 *
 * That makes them capable of going stale, so `scripts/verify.js` counts the
 * real catalogue and fails if either figure stops being true: "Commands" must
 * be the command count rounded down to a multiple of 5 (with a +), and
 * "Features" the exact number of public features.
 */
export const stats = [
  { value: "85+",  label: "Commands" },
  { value: "24",   label: "Features" },
  { value: "Free", label: "Every feature" },
];

/** A stat's value by its label, e.g. stat("Commands") → "85+". */
export function stat(label: string): string {
  const found = stats.find((s) => s.label === label);
  if (!found) throw new Error(`No home stat labelled "${label}"`);
  return found.value;
}
