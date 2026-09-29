import test from "node:test";
import assert from "node:assert";

process.env.ENCRYPTION_KEY = "test-key";
const { encrypt, decrypt } = await import("../utils/crypto.js");

test("encrypt then decrypt returns the original key", () => {
  const cipher = encrypt("my-secret-key");
  assert.notEqual(cipher, "my-secret-key");
  assert.equal(decrypt(cipher), "my-secret-key");
});

test("encrypting twice gives different ciphertext", () => {
  assert.notEqual(encrypt("abc"), encrypt("abc"));
});

test("empty values stay empty", () => {
  assert.equal(encrypt(""), "");
  assert.equal(decrypt(""), "");
});
