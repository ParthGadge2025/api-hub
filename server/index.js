import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Source from "./models/Source.js";
import Check from "./models/Check.js";
import { encrypt } from "./utils/crypto.js";
import { callSource } from "./services/callSource.js";
import { startMonitor } from "./services/monitor.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: "20kb" }));
app.use("/api", rateLimit({ windowMs: 60000, limit: 200 }));
const loginLimit = rateLimit({ windowMs: 15 * 60000, limit: 10, message: { error: "Too many attempts. Try again later." } });

const requireAdmin = (req, res, next) => {
  try {
    jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Admin login required" });
  }
};
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
const FIELDS = ["name", "description", "url", "authType", "authName", "active"];

app.post("/api/auth/login", loginLimit, (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: "Wrong email or password" });
  res.json({ token: jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "8h" }) });
});

// Public
app.get("/api/sources", async (_req, res) => res.json(await Source.find({ active: true }).select("name description")));

app.get("/api/sources/:id/data", async (req, res) => {
  try {
    const s = await Source.findOne({ _id: req.params.id, active: true }).select("+apiKey");
    if (!s) return res.status(404).json({ error: "Source not found" });
    const { res: up } = await callSource(s);
    if (!up.ok) return res.status(502).json({ error: `The API returned ${up.status}` });
    res.json(await up.json());
  } catch (e) {
    res.status(502).json({ error: "Could not reach the API: " + e.message });
  }
});

// Public: uptime, latency and recent checks for the last 24 hours
app.get("/api/status", async (_req, res) => {
  const since = new Date(Date.now() - 864e5);
  const sources = await Source.find({ active: true }).select("name description");
  res.json(
    await Promise.all(
      sources.map(async (s) => {
        const checks = await Check.find({ source: s._id, at: { $gte: since } }).sort("at").select("ok ms at -_id").lean();
        const good = checks.filter((c) => c.ok);
        return {
          _id: s._id, name: s.name, description: s.description,
          up: checks.at(-1)?.ok ?? null,
          uptime: checks.length ? +((good.length / checks.length) * 100).toFixed(1) : null,
          avgMs: good.length ? Math.round(good.reduce((a, c) => a + c.ms, 0) / good.length) : null,
          checks: checks.slice(-60),
        };
      })
    )
  );
});

// Admin
app.get("/api/admin/sources", requireAdmin, async (_req, res) => res.json(await Source.find().sort("-createdAt")));

app.post("/api/admin/sources", requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await Source.create({ ...pick(req.body, FIELDS), apiKey: encrypt(req.body.apiKey) }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch("/api/admin/sources/:id", requireAdmin, async (req, res) => {
  const update = pick(req.body, FIELDS);
  if (req.body.apiKey) update.apiKey = encrypt(req.body.apiKey);
  const s = await Source.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  s ? res.json(s) : res.status(404).json({ error: "Not found" });
});

app.delete("/api/admin/sources/:id", requireAdmin, async (req, res) => {
  await Source.findByIdAndDelete(req.params.id);
  await Check.deleteMany({ source: req.params.id });
  res.json({ ok: true });
});

await mongoose.connect(process.env.MONGO_URI);
startMonitor();
app.listen(process.env.PORT || 5000, () => console.log("API Hub server running"));
