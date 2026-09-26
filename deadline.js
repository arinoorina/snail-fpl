const FPL_BASE = "https://fantasy.premierleague.com/api";
const BROWSER_HEADERS = {
  "Accept": "application/json,text/plain,*/*",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Referer": "https://fantasy.premierleague.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
};

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: BROWSER_HEADERS,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status + " from " + url);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function findFromBootstrap(data, now) {
  const events = Array.isArray(data && data.events) ? data.events : [];
  const next = events.find(event =>
    event && event.is_next && Date.parse(event.deadline_time) > now
  ) || events.find(event =>
    event && Date.parse(event.deadline_time) > now
  );

  if (!next || !next.deadline_time) return null;

  return {
    gw: Number(next.id) || null,
    name: next.name || null,
    deadline_time: next.deadline_time,
    source: "fpl-bootstrap"
  };
}

function findFromFixtures(fixtures, now) {
  if (!Array.isArray(fixtures)) return null;

  const firstKickoffByGw = new Map();

  fixtures.forEach(fixture => {
    const gw = Number(fixture && fixture.event);
    const kickoff = Date.parse(fixture && fixture.kickoff_time);
    if (!Number.isFinite(gw) || gw <= 0 || !Number.isFinite(kickoff)) return;

    const previous = firstKickoffByGw.get(gw);
    if (!previous || kickoff < previous) firstKickoffByGw.set(gw, kickoff);
  });

  const candidates = Array.from(firstKickoffByGw.entries())
    .map(([gw, kickoff]) => ({
      gw,
      kickoff,
      // Current 2026/27 FPL rules: deadline is 90 minutes before the first match.
      deadline: kickoff - (90 * 60 * 1000)
    }))
    .filter(item => item.deadline > now)
    .sort((a, b) => a.deadline - b.deadline);

  if (!candidates.length) return null;

  const next = candidates[0];
  return {
    gw: next.gw,
    name: "Gameweek " + next.gw,
    deadline_time: new Date(next.deadline).toISOString(),
    source: "fpl-fixtures-90m"
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  const errors = [];

  try {
    const bootstrap = await fetchJson(FPL_BASE + "/bootstrap-static/?_=" + now);
    const result = findFromBootstrap(bootstrap, now);
    if (result) return sendOk(res, result);
    errors.push("bootstrap: no future deadline");
  } catch (error) {
    errors.push("bootstrap: " + String(error && error.message ? error.message : error));
  }

  // Fallback: derive the official deadline from the first fixture of the next GW.
  // FPL's 2026/27 rule is 90 minutes before that opening match.
  try {
    const fixtures = await fetchJson(FPL_BASE + "/fixtures/?_=" + now);
    const result = findFromFixtures(fixtures, now);
    if (result) return sendOk(res, result);
    errors.push("fixtures: no future deadline");
  } catch (error) {
    errors.push("fixtures: " + String(error && error.message ? error.message : error));
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(502).json({
    error: "SNAIL deadline bridge failed",
    attempts: errors
  });
}

function sendOk(res, result) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=300");
  res.setHeader("CDN-Cache-Control", "public, max-age=300, stale-while-revalidate=300");
  res.setHeader("Vercel-CDN-Cache-Control", "public, max-age=300, stale-while-revalidate=300");

  return res.status(200).json({
    gw: result.gw,
    name: result.name,
    deadline_time: result.deadline_time,
    source: result.source,
    fetched_at: new Date().toISOString()
  });
}
