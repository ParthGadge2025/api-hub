import { useEffect, useState } from "react";
import { API } from "./config.js";

function Spark({ checks }) {
  if (checks.length < 2) return <p className="muted">Collecting data…</p>;
  const w = 220, h = 44, max = Math.max(...checks.map((c) => c.ms), 1);
  const pts = checks.map((c, i) => [(i / (checks.length - 1)) * w, h - 3 - (c.ms / max) * (h - 8)]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" role="img" aria-label="Response time over the last checks">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" />
      {checks.map((c, i) => !c.ok && <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r="3" fill="var(--danger)" />)}
    </svg>
  );
}

export default function Monitor() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () => fetch(API + "/api/status").then((r) => r.json()).then(setItems).catch(() => setError("Could not load status"));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <section>
      <h2>API status (last 24 hours)</h2>
      {error && <p className="error">{error}</p>}
      {!items.length && <p className="muted">No APIs are being monitored yet. Add one in Admin.</p>}
      <div className="grid">
        {items.map((s) => (
          <article className="card" key={s._id}>
            <div className="between">
              <strong>{s.name}</strong>
              <span className={s.up === null ? "badge" : s.up ? "badge ok" : "badge bad"}>
                {s.up === null ? "Waiting" : s.up ? "Up" : "Down"}
              </span>
            </div>
            <p className="muted">{s.description}</p>
            <Spark checks={s.checks} />
            <div className="between muted">
              <span>Uptime {s.uptime ?? "–"}%</span>
              <span>Avg {s.avgMs ?? "–"} ms</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
