// Local structural check only: no network and no claim of official OpenSpec validation.
import { readdirSync, readFileSync, existsSync } from "node:fs";
const root = "openspec/changes/marketplace-prototype";
for (const file of ["proposal.md", "design.md", "tasks.md"])
  if (!existsSync(`${root}/${file}`)) throw new Error(`Missing ${file}`);
const names = readdirSync(`${root}/specs`);
if (!names.length) throw new Error("No capabilities");
for (const name of names) {
  const text = readFileSync(`${root}/specs/${name}/spec.md`, "utf8");
  for (const required of [
    "## ADDED Requirements",
    "### Requirement:",
    "SHALL",
    "#### Scenario:",
    "**WHEN**",
    "**THEN**",
  ])
    if (!text.includes(required))
      throw new Error(`${name}: missing ${required}`);
  if (/\b(TODO|TBD)\b/.test(text))
    throw new Error(`${name}: unresolved placeholder`);
}
console.log(
  `PASS: local structural check of ${names.length} capability specs (official CLI not executed).`,
);
