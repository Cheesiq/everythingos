"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GALAXIES, GALAXY_SLUGS } from "@/lib/galaxies";

/* localStorage persistence (fine outside claude.ai artifacts) */
const store = {
  get(k, fb) { try { const v = localStorage.getItem("eos:" + k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v) { try { localStorage.setItem("eos:" + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem("eos:" + k); } catch {} }
};

const APPS = {
  biome:    { title: "The Biome",       color: "#4ff0d3", x: 36,  y: 64,  w: 360, h: 320 },
  galaxies: { title: "Galaxies",        color: "#7fb4ff", x: 250, y: 90,  w: 340, h: 300 },
  dynamix:  { title: "Dynamix Toolbox", color: "#f2934a", x: 420, y: 96,  w: 300, h: 190 },
  terminal: { title: "terminal — mycelsh", color: "#4ff0d3", x: 420, y: 200, w: 400, h: 300 },
  files:    { title: "Files",           color: "#f2934a", x: 70,  y: 110, w: 430, h: 330 },
  settings: { title: "Settings",        color: "#a473ff", x: 520, y: 130, w: 330, h: 470 }
};
const APP_IDS = Object.keys(APPS);

const seedFS = () => ({
  type: "dir", children: {
    "README.txt": { type: "file", content: "Welcome to everythingOS.\nReal browser-persisted filesystem — try Files or the terminal.\n\n— Orangopus" },
    orangopus: { type: "dir", children: {
      "the-biome": { type: "dir", children: { "notes.txt": { type: "file", content: "Bioluminescent 3D environment. Mycel assistant integration." } } },
      "thng-my": { type: "dir", children: {} },
      "dynamix-toolbox": { type: "dir", children: {} }
    } }
  }
});
const splitPath = p => p.split("/").filter(Boolean);

export default function Desktop() {
  /* ---------- auth ---------- */
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState("checking"); // checking | gate | in | preview
  const [authError, setAuthError] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("auth_error");
    if (err) {
      setAuthError(err);
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetch("/api/auth/session").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) { setUser(d.user); setAuthState("in"); } else setAuthState("gate");
    }).catch(() => setAuthState("gate"));
  }, []);

  const AUTH_ERROR_MESSAGES = {
    server_not_configured: "GitHub sign-in isn't set up on this server yet — use preview mode below.",
    missing_code: "GitHub didn't send back an auth code. Try again.",
    state_mismatch: "That sign-in attempt expired or looked unsafe. Try again.",
    token_exchange_failed: "GitHub rejected the sign-in request. Try again.",
    profile_fetch_failed: "Couldn't fetch your GitHub profile. Try again.",
    unexpected_error: "Something went wrong signing in. Try again."
  };

  /* ---------- windows ---------- */
  const [wins, setWins] = useState(() => {
    const base = {};
    APP_IDS.forEach((id, i) => { base[id] = { ...APPS[id], state: ["biome", "galaxies"].includes(id) ? "open" : "closed", z: i + 2 }; });
    return base;
  });
  const [hydrated, setHydrated] = useState(false);
  const topZ = useRef(10);
  useEffect(() => {
    const saved = store.get("wm", null);
    if (saved) setWins(w => {
      const merged = { ...w };
      APP_IDS.forEach(id => { if (saved[id]) merged[id] = { ...merged[id], ...saved[id] }; });
      return merged;
    });
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) store.set("wm", wins); }, [wins, hydrated]);

  const bringFront = useCallback(id => {
    topZ.current += 1;
    setWins(w => ({ ...w, [id]: { ...w[id], z: topZ.current } }));
  }, []);
  const setWinState = (id, state) => setWins(w => ({ ...w, [id]: { ...w[id], state } }));
  const openWin = id => { setWinState(id, "open"); bringFront(id); };
  const toggleWin = id => wins[id].state === "open" ? setWinState(id, "min") : openWin(id);

  const dragRef = useRef(null);
  const onHeadDown = (id, e) => {
    if (e.target.closest(".window-controls")) return;
    bringFront(id);
    dragRef.current = { id, mode: "move", sx: e.clientX, sy: e.clientY, ox: wins[id].x, oy: wins[id].y };
  };
  const onResizeDown = (id, e) => {
    e.stopPropagation(); bringFront(id);
    dragRef.current = { id, mode: "resize", sx: e.clientX, sy: e.clientY, ow: wins[id].w, oh: wins[id].h };
  };
  useEffect(() => {
    const mv = e => {
      const d = dragRef.current; if (!d) return;
      setWins(w => {
        const cur = { ...w[d.id] };
        if (d.mode === "move") { cur.x = d.ox + e.clientX - d.sx; cur.y = Math.max(0, d.oy + e.clientY - d.sy); }
        else { cur.w = Math.max(260, d.ow + e.clientX - d.sx); cur.h = Math.max(160, d.oh + e.clientY - d.sy); }
        return { ...w, [d.id]: cur };
      });
    };
    const up = () => (dragRef.current = null);
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  /* ---------- settings + BYOK ---------- */
  const [settings, setSettings] = useState({ reducedMotion: false, accent: "default" });
  const [byok, setByok] = useState({ key: "", enabled: false });
  useEffect(() => { setSettings(store.get("settings", { reducedMotion: false, accent: "default" })); setByok(store.get("byok", { key: "", enabled: false })); }, []);
  useEffect(() => { store.set("settings", settings); }, [settings]);
  useEffect(() => { store.set("byok", byok); }, [byok]);

  /* ---------- filesystem ---------- */
  const [fs, setFs] = useState(seedFS);
  useEffect(() => { setFs(store.get("fs", null) || seedFS()); }, []);
  useEffect(() => { store.set("fs", fs); }, [fs]);
  const getNode = useCallback((tree, path) => {
    let node = tree;
    for (const part of splitPath(path)) {
      if (!node || node.type !== "dir" || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }, []);
  const mutateFS = mutator => setFs(f => { const clone = JSON.parse(JSON.stringify(f)); mutator(clone); return clone; });

  const [selPath, setSelPath] = useState("/README.txt");
  const [editorText, setEditorText] = useState("");
  const [openDirs, setOpenDirs] = useState(() => new Set(["/"]));
  useEffect(() => {
    const n = getNode(fs, selPath);
    if (n?.type === "file") setEditorText(n.content || "");
  }, [selPath, fs, getNode]);

  /* ---------- terminal ---------- */
  const [termLines, setTermLines] = useState([{ t: 'everythingOS shell — type "help".', c: "dim" }]);
  const [termCwd, setTermCwd] = useState("/");
  const termInputRef = useRef(null);
  const tprint = (t, c) => setTermLines(l => [...l.slice(-200), { t, c }]);
  const resolvePath = p => {
    if (!p) return termCwd;
    const raw = p.startsWith("/") ? p : (termCwd === "/" ? "/" + p : termCwd + "/" + p);
    const out = [];
    for (const part of splitPath(raw)) { if (part === ".") continue; if (part === "..") out.pop(); else out.push(part); }
    return "/" + out.join("/");
  };
  function runCommand(raw) {
    const line = raw.trim();
    tprint((termCwd === "/" ? "~" : termCwd) + " $ " + raw, "in");
    if (!line) return;
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");
    switch (cmd) {
      case "help": tprint("ls cd pwd cat mkdir touch rm echo clear whoami date status open settings reset", "dim"); break;
      case "pwd": tprint(termCwd); break;
      case "ls": {
        const node = getNode(fs, resolvePath(rest[0]));
        if (!node || node.type !== "dir") { tprint("ls: not a directory", "err"); break; }
        const names = Object.keys(node.children).sort();
        tprint(names.length ? names.map(n => node.children[n].type === "dir" ? n + "/" : n).join("  ") : "(empty)", names.length ? "" : "dim");
        break;
      }
      case "cd": {
        const t = resolvePath(rest[0] || "/");
        const node = getNode(fs, t);
        if (!node || node.type !== "dir") { tprint("cd: no such directory", "err"); break; }
        setTermCwd(t); break;
      }
      case "cat": {
        const node = rest[0] && getNode(fs, resolvePath(rest[0]));
        if (!node) tprint("cat: no such file", "err");
        else if (node.type === "dir") tprint("cat: is a directory", "err");
        else tprint(node.content || "(empty)");
        break;
      }
      case "mkdir": case "touch": {
        if (!rest[0]) { tprint("usage: " + cmd + " <name>", "err"); break; }
        const full = resolvePath(rest[0]);
        const parts = splitPath(full); const name = parts.pop();
        mutateFS(tree => {
          let node = tree;
          for (const part of parts) node = node.children[part];
          if (node?.type === "dir") node.children[name] = cmd === "mkdir" ? { type: "dir", children: {} } : (node.children[name] || { type: "file", content: "" });
        });
        tprint("ok"); break;
      }
      case "rm": {
        if (!rest[0]) { tprint("usage: rm <name>", "err"); break; }
        const full = resolvePath(rest[0]);
        const parts = splitPath(full); const name = parts.pop();
        mutateFS(tree => {
          let node = tree;
          for (const part of parts) node = node?.children?.[part];
          if (node?.children?.[name]) delete node.children[name];
        });
        tprint("removed"); break;
      }
      case "echo": {
        const m = arg.match(/^(.*)\s>\s*(\S+)$/);
        if (m) {
          const text = m[1].replace(/^"|"$/g, "");
          const full = resolvePath(m[2]);
          const parts = splitPath(full); const name = parts.pop();
          mutateFS(tree => {
            let node = tree;
            for (const part of parts) node = node?.children?.[part];
            if (node?.type === "dir") node.children[name] = { type: "file", content: text };
          });
          tprint("wrote " + m[2]);
        } else tprint(arg);
        break;
      }
      case "clear": setTermLines([]); break;
      case "whoami": tprint(user ? user.login + "@everythingos" : "guest@everythingos"); break;
      case "date": tprint(new Date().toString()); break;
      case "status": tprint("ecosystem: online · windows open: " + APP_IDS.filter(id => wins[id].state === "open").length); break;
      case "open": if (APP_IDS.includes(rest[0])) { openWin(rest[0]); tprint("opened " + rest[0]); } else tprint("usage: open <" + APP_IDS.join("|") + ">", "err"); break;
      case "settings": openWin("settings"); break;
      case "reset": if (confirm("Reset all everythingOS data?")) { ["wm", "settings", "byok", "fs"].forEach(store.del); location.reload(); } break;
      default: tprint(cmd + ": command not found", "err");
    }
  }

  /* ---------- Mycel chat ---------- */
  const [mycelMsgs, setMycelMsgs] = useState([{ role: "sys", content: "Mycel is listening." }]);
  const [mycelBusy, setMycelBusy] = useState(false);
  const mycelInputRef = useRef(null);
  const historyRef = useRef([]);
  async function sendMycel() {
    const input = mycelInputRef.current;
    const text = input.value.trim();
    if (!text || mycelBusy) return;
    input.value = ""; setMycelBusy(true);
    setMycelMsgs(m => [...m, { role: "user", content: text }]);
    historyRef.current.push({ role: "user", content: text });
    let reply = null;
    if (byok.enabled && byok.key) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json", "x-api-key": byok.key,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6", max_tokens: 400,
            system: "You are Mycel, the bioluminescent AI companion inside The Biome. Warm, brief, a little otherworldly.",
            messages: historyRef.current
          })
        });
        if (!res.ok) throw new Error("Claude API " + res.status);
        const data = await res.json();
        reply = data?.content?.find(b => b.type === "text")?.text || "(no reply)";
      } catch (e) {
        setMycelMsgs(m => [...m, { role: "sys", content: "Claude key error — " + e.message }]);
      }
    } else {
      try {
        const res = await fetch("/api/mycel", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: historyRef.current.slice(0, -1) })
        });
        const data = await res.json();
        if (!res.ok) {
          setMycelMsgs(m => [...m, { role: "sys", content: data.error === "OPENROUTER_KEY not configured"
            ? "Mycel can't be reached — is OPENROUTER_KEY set?"
            : "Mycel error — " + (data.error || res.status) }]);
        } else if (data.degraded) {
          setMycelMsgs(m => [...m, { role: "sys", content: "(free tier busy — " + (data.error || "") + ")" }]);
        }
        reply = data.reply;
      } catch (e) {
        setMycelMsgs(m => [...m, { role: "sys", content: "Mycel can't be reached — " + e.message }]);
      }
    }
    if (reply) {
      historyRef.current.push({ role: "assistant", content: reply });
      setMycelMsgs(m => [...m, { role: "assistant", content: reply }]);
    }
    setMycelBusy(false); input.focus();
  }

  /* ---------- files tree render ---------- */
  function renderTree(node, path, depth) {
    if (node.type !== "dir") return null;
    const names = Object.keys(node.children).sort((a, b) => {
      const A = node.children[a], B = node.children[b];
      if (A.type !== B.type) return A.type === "dir" ? -1 : 1;
      return a.localeCompare(b);
    });
    return names.map(name => {
      const childPath = path === "/" ? "/" + name : path + "/" + name;
      const child = node.children[name];
      return (
        <div key={childPath}>
          <div className={"fnode" + (childPath === selPath ? " sel" : "")}
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => {
              if (child.type === "dir") setOpenDirs(s => { const n = new Set(s); n.has(childPath) ? n.delete(childPath) : n.add(childPath); return n; });
              else setSelPath(childPath);
            }}>
            {(child.type === "dir" ? "▸ " : "· ") + name}
          </div>
          {child.type === "dir" && openDirs.has(childPath) && renderTree(child, childPath, depth + 1)}
        </div>
      );
    });
  }
  function saveFile() {
    const parts = splitPath(selPath); const name = parts.pop();
    mutateFS(tree => {
      let node = tree;
      for (const part of parts) node = node?.children?.[part];
      if (node?.children?.[name]?.type === "file") node.children[name].content = editorText;
    });
  }

  /* ---------- render ---------- */
  const accent = settings.accent === "violet" ? "#a473ff" : "#4ff0d3";

  if (authState === "checking") return <div className="bootscreen"><div className="wordmark"><span className="o">O</span><span className="os">OS</span></div></div>;

  if (authState === "gate") return (
    <div className="bootscreen">
      <div className="authcard">
        <div className="wordmark"><span className="o">O</span><span className="os">OS</span></div>
        <p className="authmsg">Sign in with GitHub to open your desktop.</p>
        {authError && <p className="autherr">{AUTH_ERROR_MESSAGES[authError] || `Sign-in failed (${authError}).`}</p>}
        <a className="gh-btn" href="/api/auth/login">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
              -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07
              -1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12
              0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82
              2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95
              .29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8
              c0-4.42-3.58-8-8-8z"/>
          </svg>
          Sign in with GitHub
        </a>
        <button className="preview-link" onClick={() => setAuthState("preview")}>Continue without login (preview mode)</button>
      </div>
    </div>
  );

  return (
    <div className="os-root" style={{ "--accent-cyan": accent }}>
      <div className="topbar">
        <div className="brand">
          <div className="wordmark"><span className="o">O</span><span className="os">OS</span></div>
          <small>EVERYTHING · ORANGOPUS</small>
        </div>
        <div className="topbar-right">
          <div className="user-chip" onClick={() => openWin("settings")}>
            {user?.avatar && <img src={user.avatar} alt="" />}
            <span>{user?.login || "preview"}</span>
          </div>
          <Clock />
        </div>
      </div>

      <div className="desktop">
        {APP_IDS.map(id => {
          const w = wins[id];
          return (
            <div key={id} className="window" data-state={w.state}
              style={{ left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z }}
              onMouseDown={() => bringFront(id)}>
              <div className="window-head" onMouseDown={e => onHeadDown(id, e)}>
                <div className="title"><span className="sw" style={{ background: APPS[id].color, color: APPS[id].color }} />{APPS[id].title}</div>
                <div className="window-controls">
                  <button className="close" onClick={() => setWinState(id, "closed")} />
                  <button className="min" onClick={() => setWinState(id, "min")} />
                  <button className="max" onClick={() => bringFront(id)} />
                </div>
              </div>
              <div className="window-body">
                {id === "biome" && (
                  <div className="mycel-wrap">
                    <div className="mycel-log">
                      {mycelMsgs.map((m, i) => <div key={i} className={"msg " + m.role}>{m.content}</div>)}
                    </div>
                    <div className="mycel-inputrow">
                      <input ref={mycelInputRef} placeholder="Say something to Mycel…" onKeyDown={e => e.key === "Enter" && sendMycel()} />
                      <button onClick={sendMycel} disabled={mycelBusy}>{mycelBusy ? "…" : "Send"}</button>
                    </div>
                  </div>
                )}
                {id === "galaxies" && (
                  <div>
                    <div className="dim-note">Each galaxy is its own page — full-screen 3D, VR-ready, M1-tuned.</div>
                    {GALAXY_SLUGS.map(slug => (
                      <Link key={slug} className="gxy-card" href={`/galaxy/${slug}`}>
                        <span className="gxy-dot" style={{ background: GALAXIES[slug].accent, boxShadow: `0 0 8px ${GALAXIES[slug].accent}` }} />
                        <span><b>{GALAXIES[slug].name}</b><i>{GALAXIES[slug].subtitle.toLowerCase()} · {(GALAXIES[slug].cfg.starCount / 1000).toFixed(0)}k stars</i></span>
                      </Link>
                    ))}
                  </div>
                )}
                {id === "dynamix" && (
                  <div>
                    <SliderRow label="Budget allocator" pct={62} />
                    <SliderRow label="Spend friction" pct={38} />
                  </div>
                )}
                {id === "terminal" && (
                  <div className="term-wrap" onClick={() => termInputRef.current?.focus()}>
                    <div className="term-log">
                      {termLines.map((l, i) => <div key={i} className={"line-" + (l.c || "out")}>{l.t}</div>)}
                    </div>
                    <div className="term-inputrow">
                      <span className="p">{(termCwd === "/" ? "~" : termCwd) + "$"}</span>
                      <input ref={termInputRef} autoComplete="off" spellCheck={false}
                        onKeyDown={e => { if (e.key === "Enter") { runCommand(e.target.value); e.target.value = ""; } }} />
                    </div>
                  </div>
                )}
                {id === "files" && (
                  <div className="files-wrap">
                    <div className="files-tree">{renderTree(fs, "/", 0)}</div>
                    <div className="files-main">
                      <div className="files-path">{selPath}</div>
                      <div className="files-toolbar">
                        <button onClick={() => { const n = prompt("New file name:", "untitled.txt"); if (n) mutateFS(t => { t.children[n] = { type: "file", content: "" }; }); }}>+ File</button>
                        <button onClick={() => { const n = prompt("New folder name:", "new-folder"); if (n) mutateFS(t => { t.children[n] = { type: "dir", children: {} }; }); }}>+ Folder</button>
                        <button onClick={saveFile}>Save</button>
                      </div>
                      <textarea className="files-editor" value={editorText} onChange={e => setEditorText(e.target.value)} />
                    </div>
                  </div>
                )}
                {id === "settings" && (
                  <div>
                    <div className="setting-row">
                      <div><div className="lab">Account</div><div className="sub">{user ? "signed in as " + user.login : "preview mode"}</div></div>
                      {user && <button className="danger-btn" style={{ marginTop: 0 }} onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.reload(); }}>Sign out</button>}
                    </div>
                    <ToggleRow label="Reduced motion" sub="Pauses ambient animation"
                      on={settings.reducedMotion} onToggle={() => setSettings(s => ({ ...s, reducedMotion: !s.reducedMotion }))} />
                    <ToggleRow label="Accent" sub="Cyan / violet"
                      on={settings.accent === "violet"} onToggle={() => setSettings(s => ({ ...s, accent: s.accent === "violet" ? "default" : "violet" }))} />
                    <div className="byok-block">
                      <div className="lab">Claude API key (BYOK)</div>
                      <div className="sub">Sent only from your browser straight to Anthropic — never through this server, stored only in your browser.</div>
                      <input type="password" placeholder="sk-ant-…" defaultValue={byok.key}
                        onChange={e => setByok(b => ({ ...b, key: e.target.value.trim() }))} />
                      <ToggleRow label="Use my key for Mycel" sub="Off = free open-source model"
                        on={byok.enabled} onToggle={() => setByok(b => (!b.key && !b.enabled) ? b : { ...b, enabled: !b.enabled })} />
                    </div>
                    <button className="danger-btn" onClick={() => { if (confirm("Reset all everythingOS data?")) { ["wm", "settings", "byok", "fs"].forEach(store.del); location.reload(); } }}>Reset all data</button>
                  </div>
                )}
              </div>
              <div className="resize-handle" onMouseDown={e => onResizeDown(id, e)} />
            </div>
          );
        })}
      </div>

      <div className="dock-wrap">
        <div className="dock">
          {APP_IDS.map(id => (
            <div key={id} className="dock-item" data-active={wins[id].state === "open"} onClick={() => toggleWin(id)}>
              <div className="dock-tip">{APPS[id].title}</div>
              <span className="dock-glyph" style={{ color: APPS[id].color }}>{APPS[id].title[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t); }, []);
  if (!now) return <span className="clock" />;
  return <span className="clock">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    <span className="date">{now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</span></span>;
}
function SliderRow({ label, pct }) {
  return (
    <div className="slider-row">
      <div className="lab-row"><span>{label}</span><span>{pct}%</span></div>
      <div className="slider-track"><div className="slider-fill" style={{ width: pct + "%" }} /></div>
    </div>
  );
}
function ToggleRow({ label, sub, on, onToggle }) {
  return (
    <div className="setting-row">
      <div><div className="lab">{label}</div><div className="sub">{sub}</div></div>
      <div className={"toggle" + (on ? " on" : "")} onClick={onToggle}><div className="knob" /></div>
    </div>
  );
}
