import assert from "node:assert/strict";
import { test } from "node:test";
import { staffFrom } from "../../app/import/staff.server.js";

const online = (user) => ({ onlineAccessInfo: { associated_user: user } });

test("takes the signed-in person's name and ID from an online session", () => {
  const session = online({ id: 138435658067, first_name: "Hidayat", last_name: "Khan", email: "h@example.com" });
  assert.deepEqual(staffFrom(session, { sub: "999" }), { id: "138435658067", name: "Hidayat Khan" });
});

test("falls back to the email when there is no name", () => {
  const session = online({ id: 5, first_name: "", last_name: " ", email: "h@example.com" });
  assert.deepEqual(staffFrom(session), { id: "5", name: "h@example.com" });
});

test("uses one name part when only one is given", () => {
  assert.equal(staffFrom(online({ id: 5, first_name: "Hidayat", last_name: "" })).name, "Hidayat");
});

test("keeps the session token's ID when the session has no person, with no name", () => {
  assert.deepEqual(staffFrom({}, { sub: "138435658067" }), { id: "138435658067", name: null });
  assert.deepEqual(staffFrom({}, undefined), { id: null, name: null });
});
