import crypto from "crypto";

// AES-256-GCM: API keys are encrypted before they reach the database
const key = () => crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY).digest();

export const encrypt = (text) => {
  if (!text) return "";
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("hex")).join(":");
};

export const decrypt = (value) => {
  if (!value) return "";
  const [iv, tag, enc] = value.split(":").map((h) => Buffer.from(h, "hex"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
};
