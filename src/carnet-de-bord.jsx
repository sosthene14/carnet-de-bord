import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Check, Truck, TrendingUp, Video } from "lucide-react";

const TRACKS = [
  { id: "rocolis", name: "Rocolis", sub: "faire percer la boîte", accent: "#B5502E", icon: Truck },
  { id: "trading", name: "Trading", sub: "apprendre, chaque semaine", accent: "#A67C1E", icon: TrendingUp },
  { id: "youtube", name: "YouTube DevOps", sub: "deux vidéos minimum par semaine", accent: "#33507D", icon: Video, goal: 2 },
];

const DEFAULT_LABELS = {
  rocolis: "avancer le produit ou parler à un partenaire",
  trading: "étudier ou pratiquer, une heure",
  youtube: "tourner ou monter une vidéo",
};

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function getMonday(input) {
  const date = new Date(input);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startStr = monday.toLocaleDateString("fr-FR", { day: "numeric", month: sameMonth ? undefined : "long" });
  const endStr = sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function defaultTasks() {
  const out = {};
  TRACKS.forEach((t) => {
    out[t.id] = [{ id: `${t.id}-default`, label: DEFAULT_LABELS[t.id] }];
  });
  return out;
}

let counter = 0;
function makeId() {
  counter += 1;
  return `t-${Date.now()}-${counter}`;
}

const STORAGE_KEY = "mission-ledger-state";

export default function CarnetDeBord() {
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [tasks, setTasks] = useState(defaultTasks());
  const [weeks, setWeeks] = useState({});
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [addingTrack, setAddingTrack] = useState(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed.tasks) setTasks(parsed.tasks);
          if (parsed.weeks) setWeeks(parsed.weeks);
        }
      } catch (e) {
        // pas d'état sauvegardé pour l'instant, on garde les valeurs par défaut
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (nextTasks, nextWeeks) => {
    try {
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify({ tasks: nextTasks, weeks: nextWeeks }));
      setSaveError(!result);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  const wk = toKey(monday);
  const weekData = weeks[wk] || {};

  function toggle(taskId, dayIdx) {
    const arr = weekData[taskId] ? [...weekData[taskId]] : Array(7).fill(false);
    arr[dayIdx] = !arr[dayIdx];
    const nextWeeks = { ...weeks, [wk]: { ...weekData, [taskId]: arr } };
    setWeeks(nextWeeks);
    persist(tasks, nextWeeks);
  }

  function addTask(trackId) {
    const label = draft.trim();
    setAddingTrack(null);
    setDraft("");
    if (!label) return;
    const nextTasks = { ...tasks, [trackId]: [...tasks[trackId], { id: makeId(), label }] };
    setTasks(nextTasks);
    persist(nextTasks, weeks);
  }

  function removeTask(trackId, taskId) {
    const nextTasks = { ...tasks, [trackId]: tasks[trackId].filter((t) => t.id !== taskId) };
    setTasks(nextTasks);
    persist(nextTasks, weeks);
  }

  function shiftWeek(delta) {
    const d = new Date(monday);
    d.setDate(d.getDate() + delta * 7);
    setMonday(getMonday(d));
  }

  function resetAll() {
    const fresh = defaultTasks();
    setTasks(fresh);
    setWeeks({});
    persist(fresh, {});
  }

  function youtubeCount() {
    const yt = tasks.youtube || [];
    let n = 0;
    yt.forEach((t) => {
      const arr = weekData[t.id] || [];
      n += arr.filter(Boolean).length;
    });
    return n;
  }

  const today = new Date();
  const todayIdx = (() => {
    const d = today.getDay();
    return d === 0 ? 6 : d - 1;
  })();
  const isCurrentWeek = toKey(getMonday(today)) === wk;

  if (!ready) {
    return (
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#56624F", padding: "2rem", fontSize: "0.9rem" }}>
        chargement du carnet…
      </div>
    );
  }

  return (
    <div className="ledger-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        .ledger-root {
          --paper: #D9E3D6;
          --paper-line: #C0CEBD;
          --ink: #232F26;
          --ink-soft: #56624F;
          font-family: 'IBM Plex Sans', sans-serif;
          background: var(--paper);
          color: var(--ink);
          min-height: 100%;
          padding: 2.25rem 1.5rem 3rem;
          box-sizing: border-box;
        }
        .ledger-inner { max-width: 640px; margin: 0 auto; }
        .ledger-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 0.35rem;
        }
        .week-nav {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.95rem;
          letter-spacing: 0.01em;
        }
        .week-nav button {
          background: none;
          border: none;
          color: var(--ink-soft);
          cursor: pointer;
          padding: 0.2rem;
          display: flex;
          border-radius: 3px;
        }
        .week-nav button:hover { color: var(--ink); background: var(--paper-line); }
        .week-nav button:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
        .mission-line { font-size: 1.05rem; font-weight: 500; margin: 0 0 1.75rem; }
        .band {
          border-top: 1px solid var(--paper-line);
          padding: 1.1rem 0 1.1rem 0.9rem;
          border-left: 3px solid var(--accent);
        }
        .band:last-of-type { border-bottom: 1px solid var(--paper-line); }
        .band-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.65rem;
        }
        .band-title-wrap { display: flex; align-items: center; gap: 0.55rem; }
        .band-title { font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 0.98rem; }
        .band-sub { color: var(--ink-soft); font-size: 0.82rem; margin-top: 0.1rem; }
        .band-goal { font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; color: var(--accent); }
        .day-row {
          display: grid;
          grid-template-columns: 1fr repeat(7, 1.65rem);
          align-items: center;
          column-gap: 0.4rem;
          padding: 0.3rem 0;
        }
        .day-row.legend { color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; }
        .task-label {
          font-size: 0.9rem;
          padding-right: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.4rem;
        }
        .task-label .remove-btn {
          opacity: 0;
          background: none;
          border: none;
          color: var(--ink-soft);
          cursor: pointer;
          padding: 0.1rem;
          line-height: 0;
        }
        .day-row:hover .remove-btn { opacity: 1; }
        .remove-btn:focus-visible { opacity: 1; outline: 2px solid var(--ink); }
        .day-cell {
          width: 1.35rem;
          height: 1.35rem;
          border: 1.5px solid var(--paper-line);
          border-radius: 3px;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background 0.12s ease, border-color 0.12s ease;
        }
        .day-cell.today { border-color: var(--ink-soft); }
        .day-cell.checked { background: var(--accent); border-color: var(--accent); }
        .day-cell:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .day-cell svg { color: var(--paper); }
        .add-row { margin-top: 0.4rem; font-size: 0.85rem; }
        .add-trigger {
          background: none;
          border: none;
          color: var(--ink-soft);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.15rem 0;
        }
        .add-trigger:hover { color: var(--ink); }
        .add-trigger:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .add-input-row { display: flex; gap: 0.4rem; align-items: center; }
        .add-input-row input {
          flex: 1;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 0.85rem;
          padding: 0.3rem 0.4rem;
          border: 1px solid var(--paper-line);
          border-radius: 3px;
          background: #EAF0E8;
          color: var(--ink);
        }
        .add-input-row input:focus { outline: none; border-color: var(--ink-soft); }
        .add-input-row button {
          background: var(--ink);
          color: var(--paper);
          border: none;
          border-radius: 3px;
          padding: 0.32rem 0.55rem;
          font-size: 0.8rem;
          cursor: pointer;
          font-family: 'IBM Plex Sans', sans-serif;
        }
        .footer-row {
          margin-top: 1.6rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--ink-soft);
        }
        .footer-row button {
          background: none;
          border: none;
          color: var(--ink-soft);
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.75rem;
          padding: 0;
        }
        .footer-row button:hover { color: var(--ink); }
        .save-warning { color: #8A3B2A; font-size: 0.75rem; }
        @media (max-width: 420px) {
          .day-row { grid-template-columns: 1fr repeat(7, 1.4rem); column-gap: 0.25rem; }
          .day-cell { width: 1.15rem; height: 1.15rem; }
        }
      `}</style>

      <div className="ledger-inner">
        <div className="ledger-header">
          <div className="week-nav">
            <button onClick={() => shiftWeek(-1)} aria-label="semaine précédente">
              <ChevronLeft size={16} />
            </button>
            <span>{formatRange(monday)}</span>
            <button onClick={() => shiftWeek(1)} aria-label="semaine suivante">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <p className="mission-line">Trois chantiers, une semaine.</p>

        {TRACKS.map((track) => {
          const Icon = track.icon;
          return (
            <div className="band" key={track.id} style={{ "--accent": track.accent }}>
              <div className="band-head">
                <div className="band-title-wrap">
                  <Icon size={15} color={track.accent} />
                  <div>
                    <div className="band-title">{track.name}</div>
                    <div className="band-sub">{track.sub}</div>
                  </div>
                </div>
                {track.goal && <div className="band-goal">{youtubeCount()}/{track.goal} cette semaine</div>}
              </div>

              <div className="day-row legend">
                <span></span>
                {DAY_LETTERS.map((d, i) => (
                  <span key={i} style={{ textAlign: "center" }}>{d}</span>
                ))}
              </div>

              {tasks[track.id].map((task) => {
                const arr = weekData[task.id] || Array(7).fill(false);
                return (
                  <div className="day-row" key={task.id}>
                    <div className="task-label">
                      <span>{task.label}</span>
                      <button className="remove-btn" onClick={() => removeTask(track.id, task.id)} aria-label="retirer ce rappel">
                        <X size={13} />
                      </button>
                    </div>
                    {DAY_NAMES.map((dayName, i) => (
                      <button
                        key={i}
                        className={`day-cell${arr[i] ? " checked" : ""}${isCurrentWeek && i === todayIdx ? " today" : ""}`}
                        onClick={() => toggle(task.id, i)}
                        aria-label={`${task.label}, ${dayName}${arr[i] ? ", fait" : ""}`}
                        aria-pressed={arr[i]}
                      >
                        {arr[i] && <Check size={11} strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                );
              })}

              <div className="add-row">
                {addingTrack === track.id ? (
                  <div className="add-input-row">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTask(track.id);
                        if (e.key === "Escape") {
                          setAddingTrack(null);
                          setDraft("");
                        }
                      }}
                      placeholder="un rappel pour ce chantier"
                    />
                    <button onClick={() => addTask(track.id)}>ajouter</button>
                  </div>
                ) : (
                  <button className="add-trigger" onClick={() => setAddingTrack(track.id)}>
                    <Plus size={13} /> ajouter un rappel
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="footer-row">
          <span>{saveError ? <span className="save-warning">la sauvegarde a échoué, réessaie</span> : "sauvegardé automatiquement"}</span>
          <button onClick={resetAll}>réinitialiser</button>
        </div>
      </div>
    </div>
  );
}
