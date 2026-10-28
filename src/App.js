import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Plus,
  Trash2,
  Trophy,
  Info,
  ChevronRight,
  Cpu,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  Gauge,
  Timer,
  Layers,
  ArrowRight,
  Sliders,
  Zap,
} from "lucide-react";

/* ============================== THEME & PALETTE ============================== */
const THEME = {
  bg: "#090D16",
  bgCard: "#111827",
  bgCardElevated: "#182234",
  border: "#1F2E47",
  borderLight: "#2E4166",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  accent: "#3B82F6",
  accentGlow: "rgba(59, 130, 246, 0.25)",
  accentHover: "#2563EB",
  purple: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const PROCESS_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#84CC16",
  "#6366F1",
  "#14B8A6",
];

const ALGO_META = {
  fcfs: {
    key: "fcfs",
    label: "FCFS",
    full: "First Come First Served",
    type: "Non-preemptive",
  },
  sjf: {
    key: "sjf",
    label: "SJF",
    full: "Shortest Job First",
    type: "Non-preemptive",
  },
  srtf: {
    key: "srtf",
    label: "SRTF",
    full: "Shortest Remaining Time First",
    type: "Preemptive",
  },
  rr: {
    key: "rr",
    label: "Round Robin",
    full: "Round Robin",
    type: "Preemptive",
  },
  priority: {
    key: "priority",
    label: "Priority",
    full: "Priority Scheduling",
    type: "Non-preemptive",
  },
};

const ALGO_INFO = {
  fcfs: {
    rule: "Processes execute strictly in order of arrival time.",
    pros: [
      "Simple to understand and implement",
      "No starvation — every process runs eventually",
      "Minimal scheduler overhead",
    ],
    cons: [
      "Convoy effect: short jobs wait behind long ones",
      "Sub-optimal average turnaround and waiting times",
    ],
    use: "Best for simple batch systems where arrival order is paramount.",
  },
  sjf: {
    rule: "The available process with the shortest burst time runs to completion.",
    pros: [
      "Provably optimal for minimizing average waiting time",
      "High overall system throughput",
    ],
    cons: [
      "Requires future knowledge of CPU burst times",
      "Can cause starvation for long processes",
    ],
    use: "Long-term scheduling in batch systems with predictable job times.",
  },
  srtf: {
    rule: "Preemptive SJF: switches CPU if a new job arrives with less remaining time.",
    pros: [
      "Extremely responsive to short burst requests",
      "Further reduces average turnaround time",
    ],
    cons: [
      "High context switching overhead",
      "Severe starvation risk for heavy processes",
    ],
    use: "Systems requiring low response time where burst tracking is viable.",
  },
  rr: {
    rule: "Processes share the CPU in cyclic turns limited by a fixed time quantum.",
    pros: [
      "Guaranteed fairness and starvation-free",
      "Optimal response time for interactive environments",
    ],
    cons: [
      "Performance heavily depends on chosen quantum size",
      "Higher context-switch overhead",
    ],
    use: "General-purpose operating systems and interactive multitasking.",
  },
  priority: {
    rule: "Executes the ready process with the highest priority (lower number = higher priority).",
    pros: [
      "Enables critical tasks to preempt standard workloads",
      "Reflects real-world business and system requirements",
    ],
    cons: [
      "Low priority tasks can starve indefinitely (needs aging)",
      "Non-preemptive variation can still be delayed by long tasks",
    ],
    use: "Real-time systems and mixed-criticality OS scheduling.",
  },
};

/* ============================== SCHEDULING ENGINES ============================== */
function mergeSegments(segments) {
  const out = [];
  for (const s of segments) {
    const last = out[out.length - 1];
    if (
      last &&
      last.type === s.type &&
      last.id === s.id &&
      last.end === s.start
    ) {
      last.end = s.end;
    } else {
      out.push({ ...s });
    }
  }
  return out.filter((s) => s.end > s.start);
}

function buildScheduleResult(name, results, rawSegments, processCount) {
  const segments = mergeSegments(rawSegments);
  const n = results.length || processCount || 1;
  const avg = (field) =>
    +(results.reduce((a, r) => a + r[field], 0) / n).toFixed(2);
  const totalTime = segments.length
    ? segments[segments.length - 1].end - segments[0].start
    : 0;
  const busy = segments
    .filter((s) => s.type === "process")
    .reduce((a, s) => a + (s.end - s.start), 0);
  const procSegs = segments.filter((s) => s.type === "process");
  let contextSwitches = 0;
  for (let i = 1; i < procSegs.length; i++) {
    if (procSegs[i].id !== procSegs[i - 1].id) contextSwitches++;
  }
  return {
    name,
    results,
    segments,
    avgWT: avg("waitingTime"),
    avgTAT: avg("turnaroundTime"),
    avgRT: avg("responseTime"),
    cpuUtilization: totalTime ? +((busy / totalTime) * 100).toFixed(1) : 0,
    throughput: totalTime ? +(n / totalTime).toFixed(3) : 0,
    contextSwitches,
    totalTime,
  };
}

function runFCFS(processes) {
  const procs = [...processes].sort(
    (a, b) => a.arrivalTime - b.arrivalTime || a.order - b.order
  );
  let time = procs.length ? procs[0].arrivalTime : 0;
  const results = [];
  const segments = [];
  for (const p of procs) {
    const start = Math.max(time, p.arrivalTime);
    if (start > time) segments.push({ type: "idle", start: time, end: start });
    const end = start + p.burstTime;
    segments.push({ type: "process", id: p.id, start, end });
    results.push({
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      completionTime: end,
      turnaroundTime: end - p.arrivalTime,
      waitingTime: end - p.arrivalTime - p.burstTime,
      responseTime: start - p.arrivalTime,
    });
    time = end;
  }
  return buildScheduleResult("FCFS", results, segments, processes.length);
}

function runSJF(processes) {
  const procs = processes.map((p) => ({ ...p, done: false }));
  let time = Math.min(...procs.map((p) => p.arrivalTime));
  const results = [];
  const segments = [];
  let completed = 0;

  while (completed < procs.length) {
    const currentTime = time;
    const avail = procs.filter((p) => !p.done && p.arrivalTime <= currentTime);

    if (!avail.length) {
      const next = procs
        .filter((p) => !p.done)
        .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
      segments.push({ type: "idle", start: currentTime, end: next.arrivalTime });
      time = next.arrivalTime;
      continue;
    }
    avail.sort(
      (a, b) =>
        a.burstTime - b.burstTime ||
        a.arrivalTime - b.arrivalTime ||
        a.order - b.order
    );
    const p = avail[0];
    const start = currentTime;
    const end = start + p.burstTime;
    segments.push({ type: "process", id: p.id, start, end });
    results.push({
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      completionTime: end,
      turnaroundTime: end - p.arrivalTime,
      waitingTime: end - p.arrivalTime - p.burstTime,
      responseTime: start - p.arrivalTime,
    });
    p.done = true;
    completed++;
    time = end;
  }
  return buildScheduleResult("SJF", results, segments, processes.length);
}

function runSRTF(processes) {
  const procs = processes.map((p) => ({
    ...p,
    remaining: p.burstTime,
    started: false,
    startTime: null,
    completionTime: null,
  }));
  let time = Math.min(...procs.map((p) => p.arrivalTime));
  let completed = 0;
  const rawSeq = [];

  while (completed < procs.length) {
    const currentTime = time;
    const avail = procs.filter(
      (p) => p.remaining > 0 && p.arrivalTime <= currentTime
    );

    if (!avail.length) {
      rawSeq.push({ t: currentTime, id: null });
      time++;
      continue;
    }
    avail.sort(
      (a, b) =>
        a.remaining - b.remaining ||
        a.arrivalTime - b.arrivalTime ||
        a.order - b.order
    );
    const p = avail[0];
    if (!p.started) {
      p.started = true;
      p.startTime = currentTime;
    }
    rawSeq.push({ t: currentTime, id: p.id });
    p.remaining--;
    time++;

    if (p.remaining === 0) {
      p.completionTime = time;
      completed++;
    }
  }
  const segments = [];
  for (const { t, id } of rawSeq) {
    const last = segments[segments.length - 1];
    if (
      last &&
      ((last.type === "idle" && id === null) ||
        (last.type === "process" && last.id === id))
    ) {
      last.end = t + 1;
    } else {
      segments.push(
        id === null
          ? { type: "idle", start: t, end: t + 1 }
          : { type: "process", id, start: t, end: t + 1 }
      );
    }
  }
  const results = procs.map((p) => ({
    id: p.id,
    arrivalTime: p.arrivalTime,
    burstTime: p.burstTime,
    completionTime: p.completionTime,
    turnaroundTime: p.completionTime - p.arrivalTime,
    waitingTime: p.completionTime - p.arrivalTime - p.burstTime,
    responseTime: p.startTime - p.arrivalTime,
  }));
  return buildScheduleResult("SRTF", results, segments, processes.length);
}

function runRoundRobin(processes, quantum) {
  const q = Math.max(1, quantum || 1);
  const procs = processes.map((p) => ({
    ...p,
    remaining: p.burstTime,
    started: false,
    startTime: null,
    completionTime: null,
  }));
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime || a.order - b.order);
  let time = procs[0].arrivalTime;
  const queue = [];
  const segments = [];
  let idx = 0;

  const pushArrived = (uptoTime) => {
    while (idx < procs.length && procs[idx].arrivalTime <= uptoTime) {
      queue.push(procs[idx++]);
    }
  };

  pushArrived(time);
  while (queue.length || idx < procs.length) {
    if (!queue.length) {
      const nextArrival = procs[idx].arrivalTime;
      segments.push({ type: "idle", start: time, end: nextArrival });
      time = nextArrival;
      pushArrived(time);
      continue;
    }
    const p = queue.shift();
    if (!p.started) {
      p.started = true;
      p.startTime = time;
    }
    const run = Math.min(q, p.remaining);
    const start = time;
    const end = start + run;
    segments.push({ type: "process", id: p.id, start, end });
    time = end;
    p.remaining -= run;
    pushArrived(time);
    if (p.remaining > 0) {
      queue.push(p);
    } else {
      p.completionTime = time;
    }
  }
  const results = procs.map((p) => ({
    id: p.id,
    arrivalTime: p.arrivalTime,
    burstTime: p.burstTime,
    completionTime: p.completionTime,
    turnaroundTime: p.completionTime - p.arrivalTime,
    waitingTime: p.completionTime - p.arrivalTime - p.burstTime,
    responseTime: p.startTime - p.arrivalTime,
  }));
  return buildScheduleResult("Round Robin", results, segments, processes.length);
}

function runPriority(processes) {
  const procs = processes.map((p) => ({
    ...p,
    done: false,
    priority: p.priority ?? 0,
  }));
  let time = Math.min(...procs.map((p) => p.arrivalTime));
  const results = [];
  const segments = [];
  let completed = 0;

  while (completed < procs.length) {
    const currentTime = time;
    const avail = procs.filter((p) => !p.done && p.arrivalTime <= currentTime);

    if (!avail.length) {
      const next = procs
        .filter((p) => !p.done)
        .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
      segments.push({ type: "idle", start: currentTime, end: next.arrivalTime });
      time = next.arrivalTime;
      continue;
    }
    avail.sort(
      (a, b) =>
        a.priority - b.priority ||
        a.arrivalTime - b.arrivalTime ||
        a.order - b.order
    );
    const p = avail[0];
    const start = currentTime;
    const end = start + p.burstTime;
    segments.push({ type: "process", id: p.id, start, end });
    results.push({
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      completionTime: end,
      turnaroundTime: end - p.arrivalTime,
      waitingTime: end - p.arrivalTime - p.burstTime,
      responseTime: start - p.arrivalTime,
    });
    p.done = true;
    completed++;
    time = end;
  }
  return buildScheduleResult("Priority", results, segments, processes.length);
}

const RUNNERS = {
  fcfs: (procs) => runFCFS(procs),
  sjf: (procs) => runSJF(procs),
  srtf: (procs) => runSRTF(procs),
  rr: (procs, q) => runRoundRobin(procs, q),
  priority: (procs) => runPriority(procs),
};

const SAMPLE = [
  { id: "P1", arrivalTime: 0, burstTime: 5, priority: 2 },
  { id: "P2", arrivalTime: 1, burstTime: 3, priority: 1 },
  { id: "P3", arrivalTime: 2, burstTime: 8, priority: 3 },
  { id: "P4", arrivalTime: 3, burstTime: 6, priority: 2 },
  { id: "P5", arrivalTime: 4, burstTime: 2, priority: 4 },
];

/* ============================== UI COMPONENTS ============================== */
function Card({ children, style }) {
  return (
    <div
      style={{
        background: THEME.bgCard,
        border: `1px solid ${THEME.border}`,
        borderRadius: "14px",
        padding: "20px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, icon: Icon, accent = THEME.accent }) {
  return (
    <div
      style={{
        background: THEME.bgCardElevated,
        border: `1px solid ${THEME.border}`,
        borderRadius: "12px",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: THEME.textSecondary,
          }}
        >
          {label}
        </span>
        {Icon && <Icon size={18} style={{ color: accent }} />}
      </div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color: THEME.textPrimary,
          display: "flex",
          alignItems: "baseline",
          gap: "4px",
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: "13px", fontWeight: "400", color: THEME.textMuted }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function GanttChart({ segments, colorMap, highlightTime }) {
  const total = segments.length
    ? segments[segments.length - 1].end - segments[0].start
    : 1;
  const start0 = segments.length ? segments[0].start : 0;
  const ticks = useMemo(() => {
    const s = new Set();
    segments.forEach((seg) => {
      s.add(seg.start);
      s.add(seg.end);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [segments]);

  return (
    <div style={{ width: "100%", overflowX: "auto", paddingBottom: "8px" }}>
      <div style={{ minWidth: Math.max(540, total * 32) }}>
        <div
          style={{
            display: "flex",
            height: "54px",
            borderRadius: "10px",
            overflow: "hidden",
            border: `1px solid ${THEME.border}`,
            background: "rgba(0,0,0,0.3)",
          }}
        >
          {segments.map((seg, i) => {
            const w = ((seg.end - seg.start) / total) * 100;
            const active =
              highlightTime != null &&
              highlightTime >= seg.start &&
              highlightTime < seg.end;
            const isIdle = seg.type === "idle";
            return (
              <div
                key={i}
                title={`${isIdle ? "IDLE" : seg.id} [${seg.start} - ${seg.end}]`}
                style={{
                  width: `${w}%`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "0.03em",
                  background: isIdle ? "rgba(148,163,184,0.06)" : colorMap[seg.id],
                  color: isIdle ? THEME.textMuted : "#0B1120",
                  borderRight: `1px solid ${THEME.bg}`,
                  opacity: highlightTime != null ? (active ? 1 : 0.3) : 1,
                  boxShadow: active
                    ? `inset 0 0 0 2px #FFFFFF, 0 0 16px ${colorMap[seg.id]}`
                    : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {isIdle ? "IDLE" : seg.id}
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "relative",
            height: "22px",
            marginTop: "6px",
          }}
        >
          {ticks.map((t, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${((t - start0) / total) * 100}%`,
                fontSize: "11px",
                fontWeight: "500",
                color: THEME.textMuted,
                transform: "translateX(-50%)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExecutionPlayer({ schedule, colorMap }) {
  const { segments, results } = schedule;
  const maxTime = segments.length ? segments[segments.length - 1].end : 0;
  const [time, setTime] = useState(segments.length ? segments[0].start : 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const minTime = segments.length ? segments[0].start : 0;

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setTime((t) => {
        if (t >= maxTime) {
          setPlaying(false);
          return t;
        }
        return t + 1;
      });
    }, 600 / speed);
    return () => clearInterval(interval);
  }, [playing, speed, maxTime]);

  const currentSeg = segments.find((s) => time >= s.start && time < s.end);
  const running =
    currentSeg && currentSeg.type === "process" ? currentSeg.id : null;
  const remainingInSlice = currentSeg ? currentSeg.end - time : 0;
  const completed = results
    .filter((r) => r.completionTime <= time)
    .map((r) => r.id);
  const readyQueue = results
    .filter(
      (r) =>
        r.arrivalTime <= time && r.completionTime > time && r.id !== running
    )
    .map((r) => r.id);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Cpu size={20} color={THEME.accent} />
          <span style={{ fontSize: "16px", fontWeight: "600", color: THEME.textPrimary }}>
            Simulation Timeline
          </span>
          <span
            style={{
              fontSize: "12px",
              padding: "3px 10px",
              borderRadius: "20px",
              background: "rgba(59,130,246,0.15)",
              color: THEME.accent,
              fontWeight: "600",
            }}
          >
            t = {time}
          </span>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: THEME.textMuted, marginRight: "4px" }}>
            Speed:
          </span>
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                background: speed === s ? THEME.accent : THEME.bgCardElevated,
                color: speed === s ? "#FFF" : THEME.textSecondary,
                transition: "all 0.15s ease",
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <GanttChart
        segments={segments}
        colorMap={colorMap}
        highlightTime={time}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
        }}
      >
        <div
          style={{
            background: "rgba(59,130,246,0.06)",
            border: `1px solid ${THEME.border}`,
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            minHeight: "90px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: THEME.textMuted,
              textTransform: "uppercase",
            }}
          >
            CPU Core
          </span>
          {running ? (
            <>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: colorMap[running],
                }}
              >
                {running}
              </span>
              <span style={{ fontSize: "12px", color: THEME.textSecondary }}>
                Slice remaining: {remainingInSlice}ms
              </span>
            </>
          ) : (
            <span style={{ fontSize: "16px", fontWeight: "600", color: THEME.textMuted }}>
              IDLE
            </span>
          )}
        </div>

        <div
          style={{
            background: THEME.bgCardElevated,
            border: `1px solid ${THEME.border}`,
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: THEME.textMuted,
              textTransform: "uppercase",
            }}
          >
            Ready Queue
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "8px",
              minHeight: "28px",
            }}
          >
            {readyQueue.length ? (
              readyQueue.map((id) => (
                <span
                  key={id}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                    background: `${colorMap[id]}25`,
                    color: colorMap[id],
                  }}
                >
                  {id}
                </span>
              ))
            ) : (
              <span style={{ fontSize: "12px", color: THEME.textMuted }}>
                queue empty
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            background: THEME.bgCardElevated,
            border: `1px solid ${THEME.border}`,
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: THEME.textMuted,
              textTransform: "uppercase",
            }}
          >
            Completed
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "8px",
              minHeight: "28px",
            }}
          >
            {completed.length ? (
              completed.map((id) => (
                <span
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    background: "rgba(16,185,129,0.15)",
                    color: THEME.success,
                  }}
                >
                  <CheckCircle2 size={12} /> {id}
                </span>
              ))
            ) : (
              <span style={{ fontSize: "12px", color: THEME.textMuted }}>
                none yet
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          marginTop: "4px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => {
            setPlaying(false);
            setTime(minTime);
          }}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: `1px solid ${THEME.border}`,
            background: THEME.bgCardElevated,
            color: THEME.textPrimary,
            cursor: "pointer",
          }}
          title="Restart"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setTime((t) => Math.max(minTime, t - 1))}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: `1px solid ${THEME.border}`,
            background: THEME.bgCardElevated,
            color: THEME.textPrimary,
            cursor: "pointer",
          }}
          title="Step Back"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          style={{
            padding: "12px 18px",
            borderRadius: "28px",
            border: "none",
            background: THEME.accent,
            color: "#FFFFFF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: "600",
            boxShadow: `0 0 16px ${THEME.accentGlow}`,
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          onClick={() => setTime((t) => Math.min(maxTime, t + 1))}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: `1px solid ${THEME.border}`,
            background: THEME.bgCardElevated,
            color: THEME.textPrimary,
            cursor: "pointer",
          }}
          title="Step Forward"
        >
          <SkipForward size={16} />
        </button>
        <input
          type="range"
          min={minTime}
          max={maxTime}
          value={time}
          onChange={(e) => {
            setPlaying(false);
            setTime(Number(e.target.value));
          }}
          style={{
            marginLeft: "12px",
            flexGrow: 1,
            maxWidth: "320px",
            accentColor: THEME.accent,
            cursor: "pointer",
          }}
        />
      </div>
    </Card>
  );
}

function ResultsTable({ results }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${THEME.border}`,
        borderRadius: "10px",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
          textAlign: "left",
        }}
      >
        <thead>
          <tr
            style={{
              background: THEME.bgCardElevated,
              borderBottom: `1px solid ${THEME.border}`,
            }}
          >
            {[
              "Process",
              "Arrival Time",
              "Burst Time",
              "Completion Time",
              "Turnaround Time",
              "Waiting Time",
              "Response Time",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "12px 16px",
                  color: THEME.textSecondary,
                  fontWeight: "600",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr
              key={r.id}
              style={{
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                borderBottom: `1px solid ${THEME.border}`,
              }}
            >
              <td
                style={{
                  padding: "12px 16px",
                  fontWeight: "700",
                  color: THEME.textPrimary,
                }}
              >
                {r.id}
              </td>
              <td style={{ padding: "12px 16px", color: THEME.textSecondary }}>
                {r.arrivalTime}
              </td>
              <td style={{ padding: "12px 16px", color: THEME.textSecondary }}>
                {r.burstTime}
              </td>
              <td style={{ padding: "12px 16px", color: THEME.textPrimary }}>
                {r.completionTime}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  color: THEME.accent,
                  fontWeight: "600",
                }}
              >
                {r.turnaroundTime}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  color: THEME.purple,
                  fontWeight: "600",
                }}
              >
                {r.waitingTime}
              </td>
              <td style={{ padding: "12px 16px", color: THEME.textPrimary }}>
                {r.responseTime}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlgorithmPage({ algoKey, schedule, colorMap }) {
  const meta = ALGO_META[algoKey];
  const info = ALGO_INFO[algoKey];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: THEME.textPrimary,
                margin: 0,
              }}
            >
              {meta.full}
            </h2>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(59,130,246,0.15)",
                color: THEME.accent,
                fontWeight: "600",
              }}
            >
              {meta.type}
            </span>
          </div>
          <p
            style={{
              fontSize: "14px",
              color: THEME.textSecondary,
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            {info.rule}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
        }}
      >
        <StatCard
          label="Avg Waiting Time"
          value={schedule.avgWT}
          unit="ms"
          icon={Timer}
          accent={THEME.purple}
        />
        <StatCard
          label="Avg Turnaround"
          value={schedule.avgTAT}
          unit="ms"
          icon={Gauge}
          accent={THEME.accent}
        />
        <StatCard
          label="Avg Response"
          value={schedule.avgRT}
          unit="ms"
          icon={Sparkles}
          accent={THEME.success}
        />
        <StatCard
          label="Context Switches"
          value={schedule.contextSwitches}
          icon={Layers}
          accent={THEME.warning}
        />
      </div>

      <ExecutionPlayer schedule={schedule} colorMap={colorMap} />

      <Card>
        <h3
          style={{
            fontSize: "15px",
            fontWeight: "600",
            color: THEME.textPrimary,
            marginBottom: "14px",
            marginTop: 0,
          }}
        >
          Process Metrics Breakdown
        </h3>
        <ResultsTable results={schedule.results} />
      </Card>

      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <Info size={18} color={THEME.accent} />
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "600",
              color: THEME.textPrimary,
              margin: 0,
            }}
          >
            Algorithm Characteristics
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            fontSize: "13px",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                textTransform: "uppercase",
                color: THEME.success,
              }}
            >
              Key Strengths
            </span>
            <ul style={{ marginTop: "10px", paddingLeft: "18px", color: THEME.textSecondary }}>
              {info.pros.map((p, i) => (
                <li key={i} style={{ marginBottom: "6px" }}>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                textTransform: "uppercase",
                color: THEME.danger,
              }}
            >
              Trade-offs & Risks
            </span>
            <ul style={{ marginTop: "10px", paddingLeft: "18px", color: THEME.textSecondary }}>
              {info.cons.map((p, i) => (
                <li key={i} style={{ marginBottom: "6px" }}>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                textTransform: "uppercase",
                color: THEME.accent,
              }}
            >
              Optimal Use Case
            </span>
            <p style={{ marginTop: "10px", color: THEME.textSecondary, lineHeight: "1.5" }}>
              {info.use}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ComparisonPage({ scheduleMap, weights, setWeights }) {
  const keys = Object.keys(scheduleMap);
  const rows = keys.map((k) => ({
    key: k,
    label: ALGO_META[k].label,
    ...scheduleMap[k],
  }));

  const bestOf = (field, dir = "min") => {
    if (!rows.length) return null;
    return rows.reduce(
      (best, r) =>
        (dir === "min" ? r[field] < best[field] : r[field] > best[field])
          ? r
          : best,
      rows[0]
    );
  };
  const bestWT = bestOf("avgWT");
  const bestTAT = bestOf("avgTAT");
  const bestRT = bestOf("avgRT");
  const bestCS = bestOf("contextSwitches");

  const norm = (field, dir = "min") => {
    const vals = rows.map((r) => r[field]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return Object.fromEntries(
      rows.map((r) => {
        const n = (r[field] - min) / range;
        return [r.key, dir === "min" ? 1 - n : n];
      })
    );
  };
  const nWT = norm("avgWT");
  const nTAT = norm("avgTAT");
  const nRT = norm("avgRT");
  const nCS = norm("contextSwitches");

  const totalW =
    weights.wt + weights.tat + weights.rt + weights.overhead || 1;
  const scores = rows
    .map((r) => ({
      key: r.key,
      label: r.label,
      score:
        (nWT[r.key] * weights.wt +
          nTAT[r.key] * weights.tat +
          nRT[r.key] * weights.rt +
          nCS[r.key] * weights.overhead) /
        totalW,
    }))
    .sort((a, b) => b.score - a.score);
  const top = scores[0];

  const chartData = (field) =>
    rows.map((r) => ({
      name: r.label,
      value: r[field],
      fill: PROCESS_COLORS[keys.indexOf(r.key) % PROCESS_COLORS.length],
    }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Card>
        <h3
          style={{
            fontSize: "15px",
            fontWeight: "600",
            color: THEME.textPrimary,
            marginBottom: "14px",
            marginTop: 0,
          }}
        >
          Comprehensive Benchmarks
        </h3>
        <div
          style={{
            overflowX: "auto",
            border: `1px solid ${THEME.border}`,
            borderRadius: "10px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  background: THEME.bgCardElevated,
                  borderBottom: `1px solid ${THEME.border}`,
                }}
              >
                {[
                  "Algorithm",
                  "Avg Waiting (WT)",
                  "Avg Turnaround (TAT)",
                  "Avg Response (RT)",
                  "CPU Utilization",
                  "Throughput",
                  "Context Switches",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      color: THEME.textSecondary,
                      fontWeight: "600",
                      fontSize: "11px",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.key}
                  style={{
                    background:
                      i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    borderBottom: `1px solid ${THEME.border}`,
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: "700",
                      color: THEME.textPrimary,
                    }}
                  >
                    {r.label}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: r.key === bestWT?.key ? THEME.success : THEME.textPrimary,
                      fontWeight: r.key === bestWT?.key ? "700" : "400",
                    }}
                  >
                    {r.avgWT} ms
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: r.key === bestTAT?.key ? THEME.success : THEME.textPrimary,
                      fontWeight: r.key === bestTAT?.key ? "700" : "400",
                    }}
                  >
                    {r.avgTAT} ms
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: r.key === bestRT?.key ? THEME.success : THEME.textPrimary,
                      fontWeight: r.key === bestRT?.key ? "700" : "400",
                    }}
                  >
                    {r.avgRT} ms
                  </td>
                  <td style={{ padding: "12px 16px", color: THEME.textSecondary }}>
                    {r.cpuUtilization}%
                  </td>
                  <td style={{ padding: "12px 16px", color: THEME.textSecondary }}>
                    {r.throughput} /ms
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: r.key === bestCS?.key ? THEME.success : THEME.textPrimary,
                      fontWeight: r.key === bestCS?.key ? "700" : "400",
                    }}
                  >
                    {r.contextSwitches}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          ["avgWT", "Average Waiting Time (ms)"],
          ["avgTAT", "Average Turnaround Time (ms)"],
          ["avgRT", "Average Response Time (ms)"],
        ].map(([field, label]) => (
          <Card key={field} style={{ padding: "16px" }}>
            <h4
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: THEME.textSecondary,
                marginBottom: "12px",
                marginTop: 0,
              }}
            >
              {label}
            </h4>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData(field)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                  <XAxis dataKey="name" tick={{ fill: THEME.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: THEME.textMuted, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: THEME.bgCardElevated,
                      border: `1px solid ${THEME.border}`,
                      color: THEME.textPrimary,
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData(field).map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <ListChecks size={18} color={THEME.accent} />
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "600",
              color: THEME.textPrimary,
              margin: 0,
            }}
          >
            System Optimization Priorities
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            ["wt", "Minimize Waiting Time"],
            ["tat", "Minimize Turnaround Time"],
            ["rt", "Maximize Response Time"],
            ["overhead", "Minimize Context Switches"],
          ].map(([k, label]) => (
            <div key={k}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  marginBottom: "6px",
                  color: THEME.textSecondary,
                }}
              >
                <span>{label}</span>
                <span style={{ fontWeight: "700", color: THEME.accent }}>
                  {weights[k]}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={weights[k]}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))
                }
                style={{
                  width: "100%",
                  accentColor: THEME.accent,
                  cursor: "pointer",
                }}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.06))",
          border: `1px solid ${THEME.borderLight}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Trophy size={20} color={THEME.warning} />
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: THEME.warning,
            }}
          >
            Recommended Choice
          </span>
        </div>
        <h2
          style={{
            fontSize: "26px",
            fontWeight: "800",
            color: THEME.textPrimary,
            margin: "0 0 16px 0",
          }}
        >
          {top?.label}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            fontSize: "13px",
          }}
        >
          <div>
            <span style={{ fontWeight: "700", color: THEME.success }}>Why this algorithm?</span>
            <ul style={{ marginTop: "8px", paddingLeft: "18px", color: THEME.textSecondary }}>
              {bestWT?.key === top?.key && <li>Optimal average waiting time</li>}
              {bestTAT?.key === top?.key && <li>Optimal turnaround efficiency</li>}
              {bestRT?.key === top?.key && <li>Fastest response times</li>}
              {bestCS?.key === top?.key && <li>Lowest context-switch overhead</li>}
              <li>Best weighted overall score for current priorities</li>
            </ul>
          </div>
          <div>
            <span style={{ fontWeight: "700", color: THEME.danger }}>Noticeable Trade-offs</span>
            <ul style={{ marginTop: "8px", paddingLeft: "18px", color: THEME.textSecondary }}>
              {bestCS?.key !== top?.key && <li>Higher context switching than non-preemptive algorithms</li>}
              {bestWT?.key !== top?.key && <li>Average waiting time is slightly sub-optimal</li>}
              <li>Score is tailored to current input bursts and weights</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProcessTable({ processes, setProcesses, showPriority, nextIdRef }) {
  const [errors, setErrors] = useState({});

  const validate = (list) => {
    const errs = {};
    const seen = new Set();
    list.forEach((p) => {
      const e = [];
      if (p.arrivalTime < 0 || p.arrivalTime === "") e.push("AT ≥ 0");
      if (!(p.burstTime > 0)) e.push("BT > 0");
      if (seen.has(p.id)) e.push("Duplicate ID");
      seen.add(p.id);
      if (e.length) errs[p.id] = e.join(", ");
    });
    setErrors(errs);
  };

  useEffect(() => {
    validate(processes);
  }, [processes]);

  const update = (id, field, value) => {
    setProcesses((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const addProcess = () => {
    const id = `P${nextIdRef.current++}`;
    setProcesses((prev) => [
      ...prev,
      { id, arrivalTime: 0, burstTime: 1, priority: 1, order: prev.length },
    ]);
  };

  const removeProcess = (id) =>
    setProcesses((prev) => prev.filter((p) => p.id !== id));

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sliders size={18} color={THEME.accent} />
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "600",
              color: THEME.textPrimary,
              margin: 0,
            }}
          >
            Process Queue Configuration
          </h3>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              setProcesses(SAMPLE.map((p, i) => ({ ...p, order: i })));
              nextIdRef.current = SAMPLE.length + 1;
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: `1px solid ${THEME.border}`,
              background: "rgba(99,102,241,0.15)",
              color: THEME.purple,
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Load Sample Set
          </button>
          <button
            onClick={() => {
              setProcesses([]);
              nextIdRef.current = 1;
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: `1px solid ${THEME.border}`,
              background: "rgba(239,68,68,0.12)",
              color: THEME.danger,
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {processes.length === 0 ? (
        <div
          style={{
            padding: "36px",
            textAlign: "center",
            border: `2px dashed ${THEME.border}`,
            borderRadius: "10px",
            color: THEME.textMuted,
            fontSize: "13px",
          }}
        >
          No processes currently defined. Click "Add Process" or load sample data.
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: `1px solid ${THEME.border}`,
            borderRadius: "10px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: THEME.bgCardElevated }}>
                <th style={{ padding: "10px 14px", color: THEME.textSecondary }}>ID</th>
                <th style={{ padding: "10px 14px", color: THEME.textSecondary }}>Arrival Time</th>
                <th style={{ padding: "10px 14px", color: THEME.textSecondary }}>Burst Time</th>
                {showPriority && (
                  <th style={{ padding: "10px 14px", color: THEME.textSecondary }}>Priority</th>
                )}
                <th style={{ padding: "10px 14px" }}></th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderTop: `1px solid ${THEME.border}`,
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 14px",
                      fontWeight: "700",
                      color: PROCESS_COLORS[i % PROCESS_COLORS.length],
                    }}
                  >
                    {p.id}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <input
                      type="number"
                      value={p.arrivalTime}
                      onChange={(e) =>
                        update(p.id, "arrivalTime", Number(e.target.value))
                      }
                      style={{
                        width: "70px",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: `1px solid ${THEME.border}`,
                        background: THEME.bg,
                        color: THEME.textPrimary,
                        fontSize: "13px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <input
                      type="number"
                      value={p.burstTime}
                      onChange={(e) =>
                        update(p.id, "burstTime", Number(e.target.value))
                      }
                      style={{
                        width: "70px",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: `1px solid ${THEME.border}`,
                        background: THEME.bg,
                        color: THEME.textPrimary,
                        fontSize: "13px",
                      }}
                    />
                  </td>
                  {showPriority && (
                    <td style={{ padding: "10px 14px" }}>
                      <input
                        type="number"
                        value={p.priority}
                        onChange={(e) =>
                          update(p.id, "priority", Number(e.target.value))
                        }
                        style={{
                          width: "70px",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: `1px solid ${THEME.border}`,
                          background: THEME.bg,
                          color: THEME.textPrimary,
                          fontSize: "13px",
                        }}
                      />
                    </td>
                  )}
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <button
                      onClick={() => removeProcess(p.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: THEME.danger,
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      title="Remove Process"
                    >
                      <Trash2 size={16} />
                    </button>
                    {errors[p.id] && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: THEME.danger,
                          marginLeft: "8px",
                        }}
                      >
                        {errors[p.id]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={addProcess}
        style={{
          padding: "10px",
          borderRadius: "8px",
          border: `1px dashed ${THEME.accent}`,
          background: "transparent",
          color: THEME.accent,
          fontWeight: "600",
          fontSize: "13px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <Plus size={16} /> Add Process
      </button>
    </Card>
  );
}

function AlgoSelector({ selected, setSelected, quantum, setQuantum }) {
  const toggle = (key) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3
          style={{
            fontSize: "15px",
            fontWeight: "600",
            color: THEME.textPrimary,
            margin: 0,
          }}
        >
          Algorithms to Test
        </h3>
        <div style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
          <button
            onClick={() => setSelected(Object.keys(ALGO_META))}
            style={{
              background: "transparent",
              border: "none",
              color: THEME.accent,
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            All
          </button>
          <button
            onClick={() => setSelected([])}
            style={{
              background: "transparent",
              border: "none",
              color: THEME.textMuted,
              cursor: "pointer",
            }}
          >
            None
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Object.values(ALGO_META).map((a) => {
          const active = selected.includes(a.key);
          return (
            <button
              key={a.key}
              onClick={() => toggle(a.key)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "10px",
                border: `1px solid ${active ? THEME.accent : THEME.border}`,
                background: active ? "rgba(59,130,246,0.1)" : THEME.bgCardElevated,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: THEME.textPrimary }}>
                  {a.label}
                </div>
                <div style={{ fontSize: "11px", color: THEME.textMuted }}>{a.type}</div>
              </div>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "4px",
                  border: `1px solid ${active ? THEME.accent : THEME.border}`,
                  background: active ? THEME.accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {active && <CheckCircle2 size={12} color="#FFF" />}
              </div>
            </button>
          );
        })}
      </div>

      {selected.includes("rr") && (
        <div style={{ marginTop: "4px" }}>
          <label
            style={{
              fontSize: "12px",
              color: THEME.textSecondary,
              display: "block",
              marginBottom: "6px",
            }}
          >
            Round Robin Quantum (ms)
          </label>
          <input
            type="number"
            min={1}
            value={quantum}
            onChange={(e) => setQuantum(Number(e.target.value))}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${THEME.border}`,
              background: THEME.bg,
              color: THEME.textPrimary,
              fontSize: "13px",
            }}
          />
        </div>
      )}
    </Card>
  );
}

function Landing({ onStart, onSample }) {
  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 20px",
        background: "radial-gradient(circle at 50% 20%, rgba(59,130,246,0.12), transparent 70%)",
        borderRadius: "24px",
        border: `1px solid ${THEME.border}`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          borderRadius: "20px",
          background: "rgba(59,130,246,0.15)",
          color: THEME.accent,
          fontSize: "12px",
          fontWeight: "600",
          marginBottom: "20px",
        }}
      >
        <Zap size={14} /> Operating Systems Scheduling Simulator
      </div>

      <h1
        style={{
          fontSize: "clamp(32px, 5vw, 54px)",
          fontWeight: "800",
          color: THEME.textPrimary,
          margin: "0 0 16px 0",
          lineHeight: "1.15",
          letterSpacing: "-0.02em",
        }}
      >
        CPU Scheduling
        <br />
        Visualizer & Analyzer
      </h1>

      <p
        style={{
          maxWidth: "580px",
          fontSize: "16px",
          color: THEME.textSecondary,
          lineHeight: "1.6",
          margin: "0 0 32px 0",
        }}
      >
        Simulate, compare, and analyze FCFS, SJF, SRTF, Round Robin, and Priority
        scheduling algorithms with real-time Gantt tracking and metric optimization.
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={onStart}
          style={{
            padding: "14px 28px",
            borderRadius: "12px",
            border: "none",
            background: THEME.accent,
            color: "#FFF",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: `0 0 20px ${THEME.accentGlow}`,
          }}
        >
          Start Custom Workspace <ChevronRight size={18} />
        </button>
        <button
          onClick={onSample}
          style={{
            padding: "14px 28px",
            borderRadius: "12px",
            border: `1px solid ${THEME.border}`,
            background: THEME.bgCardElevated,
            color: THEME.textPrimary,
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Load Standard Benchmark
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "48px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {Object.values(ALGO_META).map((a) => (
          <div
            key={a.key}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: `1px solid ${THEME.border}`,
              background: THEME.bgCard,
              fontSize: "12px",
              fontWeight: "600",
              color: THEME.textSecondary,
            }}
          >
            {a.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== MAIN ROOT APP ============================== */
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [processes, setProcesses] = useState([]);
  const nextIdRef = useRef(1);
  const [selected, setSelected] = useState([
    "fcfs",
    "sjf",
    "srtf",
    "rr",
    "priority",
  ]);
  const [quantum, setQuantum] = useState(2);
  const [ran, setRan] = useState(false);
  const [activeTab, setActiveTab] = useState("fcfs");
  const [weights, setWeights] = useState({
    wt: 6,
    tat: 6,
    rt: 5,
    overhead: 4,
  });

  useEffect(() => {
    setProcesses((prev) => prev.map((p, i) => ({ ...p, order: i })));
  }, []);

  const validProcesses = processes.filter(
    (p) => p.arrivalTime >= 0 && p.burstTime > 0
  );
  const idsUnique =
    new Set(validProcesses.map((p) => p.id)).size === validProcesses.length;
  const canRun = validProcesses.length > 0 && idsUnique;

  const colorMap = useMemo(() => {
    const m = {};
    processes.forEach((p, i) => {
      m[p.id] = PROCESS_COLORS[i % PROCESS_COLORS.length];
    });
    return m;
  }, [processes]);

  const scheduleMap = useMemo(() => {
    if (!ran || !canRun) return {};
    const withOrder = validProcesses.map((p, i) => ({ ...p, order: i }));
    const map = {};
    selected.forEach((key) => {
      map[key] =
        key === "rr"
          ? RUNNERS.rr(withOrder, quantum)
          : RUNNERS[key](withOrder);
    });
    return map;
  }, [ran, canRun, selected, quantum, validProcesses]);

  const run = () => {
    if (!canRun) return;
    setRan(true);
    setActiveTab(selected[0] || "fcfs");
  };

  const startFromLanding = () => setScreen("dashboard");
  const sampleFromLanding = () => {
    setProcesses(SAMPLE.map((p, i) => ({ ...p, order: i })));
    nextIdRef.current = SAMPLE.length + 1;
    setScreen("dashboard");
  };

  const tabs = [
    ...selected,
    ...(ran && selected.length ? ["comparison"] : []),
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: THEME.bg,
        color: THEME.textPrimary,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        boxSizing: "border-box",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
        {screen === "landing" ? (
          <Landing onStart={startFromLanding} onSample={sampleFromLanding} />
        ) : (
          <>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "28px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(59,130,246,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Cpu size={22} color={THEME.accent} />
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      margin: 0,
                      color: THEME.textPrimary,
                    }}
                  >
                    OS Scheduling Visualizer
                  </h1>
                  <p
                    style={{
                      fontSize: "12px",
                      color: THEME.textMuted,
                      margin: 0,
                    }}
                  >
                    Compare · Simulate · Analyze Scheduling Algorithms
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setScreen("landing");
                  setRan(false);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${THEME.border}`,
                  background: THEME.bgCard,
                  color: THEME.textSecondary,
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ← Back to Home
              </button>
            </header>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "20px",
                marginBottom: "28px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <AlgoSelector
                  selected={selected}
                  setSelected={setSelected}
                  quantum={quantum}
                  setQuantum={setQuantum}
                />
                <button
                  onClick={run}
                  disabled={!canRun || !selected.length}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    background: THEME.accent,
                    color: "#FFF",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: canRun && selected.length ? "pointer" : "not-allowed",
                    opacity: canRun && selected.length ? 1 : 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: canRun ? `0 0 16px ${THEME.accentGlow}` : "none",
                  }}
                >
                  <Play size={16} /> Run Schedule Simulation
                </button>
                {!canRun && processes.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(239,68,68,0.1)",
                      color: THEME.danger,
                      fontSize: "12px",
                    }}
                  >
                    <AlertTriangle size={14} /> Correct table input errors before running.
                  </div>
                )}
              </div>

              <div style={{ flexGrow: 1 }}>
                <ProcessTable
                  processes={processes}
                  setProcesses={setProcesses}
                  showPriority={selected.includes("priority")}
                  nextIdRef={nextIdRef}
                />
              </div>
            </div>

            {ran && canRun && selected.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    overflowX: "auto",
                    borderBottom: `1px solid ${THEME.border}`,
                    paddingBottom: "4px",
                  }}
                >
                  {tabs.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "8px 8px 0 0",
                        border: "none",
                        background:
                          activeTab === t ? THEME.bgCard : "transparent",
                        color:
                          activeTab === t ? THEME.textPrimary : THEME.textMuted,
                        borderBottom:
                          activeTab === t
                            ? `2px solid ${THEME.accent}`
                            : "2px solid transparent",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t === "comparison" ? "📊 Full Comparison" : ALGO_META[t].label}
                    </button>
                  ))}
                </div>

                {activeTab === "comparison" ? (
                  <ComparisonPage
                    scheduleMap={scheduleMap}
                    weights={weights}
                    setWeights={setWeights}
                  />
                ) : scheduleMap[activeTab] ? (
                  <AlgorithmPage
                    algoKey={activeTab}
                    schedule={scheduleMap[activeTab]}
                    colorMap={colorMap}
                  />
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}