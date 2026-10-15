import assert from "node:assert/strict";
import test from "node:test";
import { getAuthErrorMessage } from "../src/lib/auth-error.mjs";

test("OAuth callback failure explains the return to login", () => {
  assert.match(getAuthErrorMessage("OAuthCallback"), /could not complete sign-in/i);
});

test("unknown errors are not reflected into the page", () => {
  const message = getAuthErrorMessage("postgresql://user:private-password@example.com/db");
  assert.doesNotMatch(message, /private-password|postgresql/);
  assert.equal(getAuthErrorMessage(undefined), null);
});

test("account linking errors tell the user to use their original method", () => {
  assert.match(getAuthErrorMessage("OAuthAccountNotLinked"), /original sign-in method/i);
});
