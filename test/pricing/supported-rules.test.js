// The app prices a product by the rules in its data, not by its CFS type name, and refuses
// any product whose data holds a rule or field it does not understand.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { unsupportedReason } from "../../app/pricing/quote.server.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const FIXTURES = ["natural-gold", "fargo", "moreno", "paris", "mayfair", "zenaya", "loft"];

test("all seven test products of seven different CFS types use only rules the app understands", () => {
  const types = new Set();
  for (const name of FIXTURES) {
    const product = load(name);
    types.add(product.workflow.mode);
    assert.equal(unsupportedReason(product), null, name);
  }
  assert.equal(types.size, 7);
});

test("an unknown setting, group rule, choice setting or price setting is refused", () => {
  const cases = [
    [(p) => (p.workflow.minimumOrder = 2), /setting the app does not know: "minimumOrder"/],
    [(p) => (p.workflow.groups[0].maxChoices = 3), /rule the app does not know: "maxChoices"/],
    [(p) => (p.options[0].mappings.priceTable = []), /setting the app does not know: "priceTable"/],
    [(p) => (p.options[0].mappings.assignments[0].per_cm = "1.50"), /price setting the app does not know: "per_cm"/],
    [(p) => (p.options[0].mappings.kind = "measured"), /kind the app does not price yet: "measured"/],
  ];
  for (const [change, reason] of cases) {
    const product = load("fargo");
    change(product);
    assert.match(unsupportedReason(product), reason);
  }
});

test("group order rules must point to an earlier group", () => {
  const later = load("mayfair");
  later.workflow.groups[0].requires = "Select Base Frame Finish";
  assert.match(unsupportedReason(later), /must come after "Select Base Frame Finish", which is not an earlier group/);

  const repeated = load("fargo");
  repeated.workflow.groups.push({ ...repeated.workflow.groups[0] });
  assert.match(unsupportedReason(repeated), /appears twice/);

  const unclear = load("fargo");
  delete unclear.workflow.groups[0].optional;
  assert.match(unsupportedReason(unclear), /does not say whether it is optional/);

  const missing = load("fargo");
  missing.workflow = null;
  assert.match(unsupportedReason(missing), /missing or unreadable/);
});
