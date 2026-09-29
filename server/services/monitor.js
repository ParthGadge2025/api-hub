import Source from "../models/Source.js";
import Check from "../models/Check.js";
import { callSource } from "./callSource.js";

const alert = (text) =>
  process.env.ALERT_WEBHOOK_URL &&
  fetch(process.env.ALERT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text }), // Slack and Discord formats
  }).catch(() => {});

async function runChecks() {
  const sources = await Source.find({ active: true }).select("+apiKey");
  await Promise.all(
    sources.map(async (s) => {
      let ok = false, status = 0, ms = 0;
      try {
        const r = await callSource(s);
        ok = r.res.ok; status = r.res.status; ms = r.ms;
      } catch {}
      const prev = await Check.findOne({ source: s._id }).sort("-at");
      await Check.create({ source: s._id, ok, status, ms });
      if (prev && prev.ok !== ok) alert(`${s.name} is ${ok ? "back up" : "DOWN"} (HTTP ${status || "no response"})`);
    })
  );
}

export function startMonitor() {
  runChecks();
  setInterval(runChecks, (Number(process.env.CHECK_MINUTES) || 5) * 60000);
}
