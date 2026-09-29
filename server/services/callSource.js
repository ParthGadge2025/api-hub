import dns from "dns/promises";
import { decrypt } from "../utils/crypto.js";

const PRIVATE = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd]|fe80)/i;

// Calls a saved API with its key attached. Blocks private addresses (SSRF protection).
export async function callSource(source) {
  const url = new URL(source.url);
  const { address } = await dns.lookup(url.hostname);
  if (PRIVATE.test(address) && process.env.ALLOW_PRIVATE !== "true")
    throw new Error("Private network addresses are blocked");

  const headers = { Accept: "application/json" };
  const apiKey = decrypt(source.apiKey);
  if (source.authType === "header") headers[source.authName] = apiKey;
  if (source.authType === "query") url.searchParams.set(source.authName, apiKey);

  const start = Date.now();
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  return { res, ms: Date.now() - start };
}
