const params = new URLSearchParams(window.location.search);
const state = {
  events: [],
  quick: "all",
  view:
    document.body.dataset.view === "week" || params.get("view") === "week"
      ? "week"
      : "upcoming",
};
const $ = (s) => document.querySelector(s);
const els = {
  events: $("#events"),
  loading: $("#loading"),
  error: $("#error"),
  empty: $("#empty"),
  count: $("#result-count"),
  search: $("#search"),
  sport: $("#sport"),
  level: $("#level"),
  team: $("#team"),
  clear: $("#clear"),
  print: $("#print"),
  printSummary: $("#print-summary"),
};

function parseCSV(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      n = text[i + 1];
    if (c === '"' && quoted && n === '"') {
      cell += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && n === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows.shift().map((h) => h.trim());
  return rows.map((values) =>
    Object.fromEntries(headers.map((h, i) => [h, (values[i] || "").trim()])),
  );
}
const esc = (value) =>
  String(value).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
const dateFrom = (value) => new Date(`${value}T12:00:00`);
const fullDate = (value) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(dateFrom(value));
const todayKey = () => {
  const d = new Date(),
    p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const daysFromTodayKey = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function eventTime(e) {
  if (e.time_tbd === "1" || !e.start_time) return "TBD";
  const [time, period] = e.start_time.split(" ");
  return `${time}<small>${period || ""}</small>`;
}
function title(e) {
  const prefix = [
    e.level !== "Unspecified" && e.level,
    e.team !== "Unspecified" && e.team,
    e.sport,
  ]
    .filter(Boolean)
    .join(" ");
  return `${prefix} <span class="sr-only">${e.home_away === "Home" ? "versus" : "at"}</span><br>${e.home_away === "Home" ? "vs" : "at"} ${esc(e.opponent_event)}`;
}
function streamAction(e) {
  const value = e.stream_url || e.youtube_url || e.livestream_url;
  if (!value) return "";

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";

    const isYouTube = ["youtube.com", "youtu.be"].some(
      (domain) =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`),
    );
    const label = isYouTube ? "YouTube" : "Watch stream";
    const eventName = `${e.sport} ${e.home_away === "Home" ? "versus" : "at"} ${e.opponent_event}`;

    return `<a class="stream-link${isYouTube ? " youtube" : ""}" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(`${label}: ${eventName}`)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="4"></rect><path d="m10 9 5 3-5 3Z"></path></svg><span>${label}</span></a>`;
  } catch {
    return "";
  }
}
function card(e) {
  const notes = [
    e.venue,
    e.event_type !== "Regular Season" && e.event_type,
  ].filter(Boolean);
  return `<article class="event-card"><div class="time">${eventTime(e)}</div><div class="event-main"><div class="event-top"><h4>${title(e)}</h4><span class="location-badge ${e.home_away.toLowerCase()}">${esc(e.home_away || "Event")}</span></div><p class="event-meta"><span>${esc(e.sport)}</span><span>${esc(e.level === "Unspecified" ? "Level TBD" : e.level)}</span>${notes.map((x) => `<span>${esc(x)}</span>`).join("")}</p>${e.timing_note ? `<p class="event-note">${esc(e.timing_note)}</p>` : ""}${streamAction(e)}</div></article>`;
}
function render() {
  const q = els.search.value.trim().toLowerCase();
  const weekEnd = state.view === "week" ? daysFromTodayKey(6) : null;
  const filtered = state.events.filter(
    (e) =>
      (!weekEnd || e.date <= weekEnd) &&
      (!q ||
        [e.opponent_event, e.venue, e.sport, e.team, e.notes]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      (!els.sport.value || e.sport === els.sport.value) &&
      (!els.level.value || e.level === els.level.value) &&
      (!els.team.value || e.team === els.team.value) &&
      (state.quick === "all" || e.home_away.toLowerCase() === state.quick),
  );
  const groups = Object.groupBy
    ? Object.groupBy(filtered, (e) => e.date)
    : filtered.reduce((a, e) => ((a[e.date] ??= []).push(e), a), {});
  els.events.innerHTML = Object.entries(groups)
    .map(
      ([date, events]) =>
        `<section class="date-group ${date === todayKey() ? "today" : ""}"><h3><span>${date === todayKey() ? "Today · " : ""}${fullDate(date)}</span></h3><div class="event-list">${events.map(card).join("")}</div></section>`,
    )
    .join("");
  els.count.textContent = `${filtered.length} event${filtered.length === 1 ? "" : "s"}${state.view === "week" ? " · Next 7 days" : ""}`;
  els.empty.hidden = filtered.length > 0;
  els.clear.hidden =
    !q &&
    !els.sport.value &&
    !els.level.value &&
    !els.team.value &&
    state.quick === "all";
}
function fill(id, key, label, options = {}) {
  const values = [
    ...new Set(
      state.events.map((e) => e[key]).filter((v) => v && v !== "Unspecified"),
    ),
  ].sort((a, b) => {
    const aIndex = options.order?.indexOf(a) ?? -1;
    const bIndex = options.order?.indexOf(b) ?? -1;
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.localeCompare(b);
  });
  $(id).insertAdjacentHTML(
    "beforeend",
    values
      .map(
        (v) =>
          `<option value="${esc(v)}">${esc(options.labels?.[v] || v)}</option>`,
      )
      .join(""),
  );
  $(id).firstElementChild.textContent = options.allLabel || `All ${label}`;
}
function reset() {
  els.search.value = els.sport.value = els.level.value = els.team.value = "";
  state.quick = "all";
  document.querySelectorAll(".chip").forEach((b) => {
    const active = b.dataset.quick === "all";
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  render();
}
function preparePrint() {
  const filters = [
    state.quick !== "all" &&
      `${state.quick[0].toUpperCase()}${state.quick.slice(1)} events`,
    els.sport.value,
    els.level.value,
    els.team.value,
    els.search.value && `Search: “${els.search.value.trim()}”`,
  ].filter(Boolean);
  els.printSummary.textContent = `${els.count.textContent} · ${filters.length ? filters.join(" · ") : "All events"} · Printed ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date())}`;
}
async function load() {
  els.loading.hidden = false;
  els.error.hidden = true;
  try {
    const response = await fetch(document.body.dataset.csvUrl, {
      cache: "no-store",
    });
    if (!response.ok) throw Error(response.status);
    state.events = parseCSV(await response.text())
      .filter((e) => e.date && e.date >= todayKey())
      .sort((a, b) =>
        `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`),
      );
    fill("#sport", "sport", "sports");
    fill("#level", "level", "levels", {
      order: ["Varsity", "JV/Varsity", "MS"],
      labels: { MS: "Middle School" },
      allLabel: "All Levels",
    });
    fill("#team", "team", "teams", {
      order: ["Boys", "Girls", "Combined"],
    });
    els.loading.hidden = true;
    render();
  } catch (error) {
    console.error(error);
    els.loading.hidden = true;
    els.error.hidden = false;
    els.count.textContent = "Unavailable";
  }
}
let timer;
els.search.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(render, 120);
});
[els.sport, els.level, els.team].forEach((el) =>
  el.addEventListener("change", render),
);
document.querySelectorAll(".chip").forEach((b) =>
  b.addEventListener("click", () => {
    state.quick = b.dataset.quick;
    document.querySelectorAll(".chip").forEach((x) => {
      const active = x === b;
      x.classList.toggle("active", active);
      x.setAttribute("aria-pressed", String(active));
    });
    render();
  }),
);
els.clear.addEventListener("click", reset);
$("#reset").addEventListener("click", reset);
$("#retry").addEventListener("click", load);
els.print.addEventListener("click", () => {
  preparePrint();
  window.print();
});
window.addEventListener("beforeprint", preparePrint);
load();
