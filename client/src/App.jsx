import { useEffect, useState } from "react";
import Monitor from "./Monitor.jsx";
import { API } from "./config.js";

const call = async (path, { method = "GET", body, token } = {}) => {
  const res = await fetch(API + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// Find the first array in the response (top level or one level down)
const findRows = (d) => (Array.isArray(d) ? d : Object.values(d || {}).find(Array.isArray) || null);

function Dashboard() {
  const [sources, setSources] = useState([]);
  const [active, setActive] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { call("/sources").then(setSources).catch((e) => setError(e.message)); }, []);

  const load = async (s) => {
    setActive(s); setData(null); setError("");
    try { setData(await call(`/sources/${s._id}/data`)); } catch (e) { setError(e.message); }
  };

  const rows = findRows(data);
  const cols = rows?.[0] && typeof rows[0] === "object"
    ? Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object").slice(0, 6) : [];

  return (
    <div className="split">
      <aside>
        <h2>Data sources</h2>
        {!sources.length && <p className="muted">No sources yet. Log in to Admin and add an API.</p>}
        {sources.map((s) => (
          <button key={s._id} className={active?._id === s._id ? "item on" : "item"} onClick={() => load(s)}>
            <strong>{s.name}</strong><span>{s.description}</span>
          </button>
        ))}
      </aside>
      <section>
        {error && <p className="error">{error}</p>}
        {!active && <p className="muted">Pick a source to load its data.</p>}
        {active && !data && !error && <p className="muted">Loading {active.name}…</p>}
        {rows && cols.length > 0 && (
          <div className="scroll">
            <table>
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 50).map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        {data && !cols.length && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </section>
    </div>
  );
}

const empty = { name: "", description: "", url: "", authType: "none", authName: "", apiKey: "" };

function Admin({ token, setToken }) {
  const [cred, setCred] = useState({ email: "", password: "" });
  const [list, setList] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const refresh = () => call("/admin/sources", { token }).then(setList).catch((e) => { setError(e.message); setToken(""); });
  useEffect(() => { if (token) refresh(); }, [token]);

  const login = async (e) => {
    e.preventDefault(); setError("");
    try { const { token } = await call("/auth/login", { method: "POST", body: cred }); localStorage.setItem("token", token); setToken(token); }
    catch (err) { setError(err.message); }
  };

  const add = async (e) => {
    e.preventDefault(); setError("");
    try { await call("/admin/sources", { method: "POST", body: form, token }); setForm(empty); refresh(); }
    catch (err) { setError(err.message); }
  };

  const toggle = (s) => call(`/admin/sources/${s._id}`, { method: "PATCH", body: { active: !s.active }, token }).then(refresh);
  const remove = (s) => confirm(`Delete ${s.name}?`) && call(`/admin/sources/${s._id}`, { method: "DELETE", token }).then(refresh);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!token)
    return (
      <form className="card narrow" onSubmit={login}>
        <h2>Admin login</h2>
        <input placeholder="Email" value={cred.email} onChange={(e) => setCred({ ...cred, email: e.target.value })} />
        <input placeholder="Password" type="password" value={cred.password} onChange={(e) => setCred({ ...cred, password: e.target.value })} />
        <button className="primary">Log in</button>
        {error && <p className="error">{error}</p>}
      </form>
    );

  return (
    <div className="split">
      <form className="card" onSubmit={add}>
        <h2>Add an API</h2>
        <input required placeholder="Name (e.g. Users)" value={form.name} onChange={set("name")} />
        <input placeholder="Description" value={form.description} onChange={set("description")} />
        <input required placeholder="API URL (https://…)" value={form.url} onChange={set("url")} />
        <select value={form.authType} onChange={set("authType")}>
          <option value="none">No authentication</option>
          <option value="header">API key in header</option>
          <option value="query">API key in query string</option>
        </select>
        {form.authType !== "none" && (
          <>
            <input required placeholder={form.authType === "header" ? "Header name (x-api-key)" : "Parameter name (apikey)"} value={form.authName} onChange={set("authName")} />
            <input required type="password" placeholder="API key" value={form.apiKey} onChange={set("apiKey")} />
          </>
        )}
        <button className="primary">Save API</button>
        {error && <p className="error">{error}</p>}
      </form>
      <section>
        <h2>Your APIs</h2>
        {!list.length && <p className="muted">Nothing here yet. Add your first API.</p>}
        {list.map((s) => (
          <div className="row" key={s._id}>
            <div><strong>{s.name}</strong><span className="muted">{s.url}</span></div>
            <button onClick={() => toggle(s)}>{s.active ? "Disable" : "Enable"}</button>
            <button className="danger" onClick={() => remove(s)}>Delete</button>
          </div>
        ))}
        <button onClick={() => { localStorage.removeItem("token"); setToken(""); }}>Log out</button>
      </section>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  return (
    <main>
      <header>
        <h1>API Hub</h1>
        <nav>
          <button className={tab === "dashboard" ? "on" : ""} onClick={() => setTab("dashboard")}>Dashboard</button>
          <button className={tab === "status" ? "on" : ""} onClick={() => setTab("status")}>Status</button>
          <button className={tab === "admin" ? "on" : ""} onClick={() => setTab("admin")}>Admin</button>
        </nav>
      </header>
      {tab === "dashboard" && <Dashboard />}
      {tab === "status" && <Monitor />}
      {tab === "admin" && <Admin token={token} setToken={setToken} />}
    </main>
  );
}
