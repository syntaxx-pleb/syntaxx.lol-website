/**
 * Claims the home page's hero makes concrete, also used by the Discord link
 * previews (linkPreviews.ts).
 *
 * These numbers describe the catalogue in Commands.tsx, but are written out
 * rather than derived from it: importing that array here would pull the whole
 * 27 kB command list into the landing page's bundle and undo the code-split
 * App.tsx sets up deliberately.
 *
 * That makes them capable of going stale, so `scripts/verify.js` counts the
 * real catalogue and fails if either figure stops being true. Change a command
 * or a category and the check will tell you to change these too.
 */
export const stats = [
  { value: "100+", label: "Commands" },
  { value: "14",   label: "Categories" },
  { value: "Free", label: "Every feature" },
];

/** A stat's value by its label, e.g. stat("Commands") → "100+". */
export function stat(label: string): string {
  const found = stats.find((s) => s.label === label);
  if (!found) throw new Error(`No home stat labelled "${label}"`);
  return found.value;
}
