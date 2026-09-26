const FPL_BASE = "https://fantasy.premierleague.com/api";

async function fetchOfficialFplJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-GB,en;q=0.9",
        "Referer": "https://fantasy.premierleague.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
      }
    });

    if (!response.ok) throw new Error("FPL HTTP " + response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function getNextDeadlineFromBootstrap(data, now) {
  const events = Array.isArray(data && data.events) ? data.events : [];
  const next = events.find(function(event) {
    return event && event.is_next && Date.parse(event.deadline_time) > now;
  }) || events.find(function(event) {
    return event && Date.parse(event.deadline_time) > now;
  });

  if (!next || !next.deadline_time) return null;
  return {
    gw: Number(next.id) || null,
    name: next.name || null,
    deadline_time: next.deadline_time,
    source: "fpl-bootstrap"
  };
}

function getNextDeadlineFromFixtures(fixtures, now) {
  if (!Array.isArray(fixtures)) return null;
  const firstKickoffByGw = new Map();

  fixtures.forEach(function(fixture) {
    const gw = Number(fixture && fixture.event);
    const kickoff = Date.parse(fixture && fixture.kickoff_time);
    if (!Number.isFinite(gw) || gw <= 0 || !Number.isFinite(kickoff)) return;
    const previous = firstKickoffByGw.get(gw);
    if (!previous || kickoff < previous) firstKickoffByGw.set(gw, kickoff);
  });

  const candidates = Array.from(firstKickoffByGw.entries())
    .map(function(entry) {
      return { gw: entry[0], deadline: entry[1] - (90 * 60 * 1000) };
    })
    .filter(function(item) { return item.deadline > now; })
    .sort(function(a, b) { return a.deadline - b.deadline; });

  if (!candidates.length) return null;
  return {
    gw: candidates[0].gw,
    name: "Gameweek " + candidates[0].gw,
    deadline_time: new Date(candidates[0].deadline).toISOString(),
    source: "fpl-fixtures-90m"
  };
}

async function handleDeadline(res) {
  const now = Date.now();
  const attempts = [];

  try {
    const bootstrap = await fetchOfficialFplJson(FPL_BASE + "/bootstrap-static/?_=" + now);
    const result = getNextDeadlineFromBootstrap(bootstrap, now);
    if (result) return sendDeadline(res, result);
    attempts.push("bootstrap: no future deadline");
  } catch (error) {
    attempts.push("bootstrap: " + String(error && error.message ? error.message : error));
  }

  try {
    const fixtures = await fetchOfficialFplJson(FPL_BASE + "/fixtures/?_=" + now);
    const result = getNextDeadlineFromFixtures(fixtures, now);
    if (result) return sendDeadline(res, result);
    attempts.push("fixtures: no future deadline");
  } catch (error) {
    attempts.push("fixtures: " + String(error && error.message ? error.message : error));
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(502).json({
    error: "SNAIL deadline mode failed",
    attempts: attempts
  });
}

function sendDeadline(res, result) {
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (String(req.query && req.query.mode || "").toLowerCase() === "deadline") {
    return handleDeadline(res);
  }

  try {
    const upstream = await fetch(
      "https://script.google.com/macros/s/AKfycbzrEbDQ4ur-UO6yGZc3qfD8VG0PdR7f_exJZo9976-skzgvq8oeSA_7Lj5LZ-vtV3Yohw/exec?api=1",
      {
        method: "GET",
        redirect: "follow",
        headers: { "Accept": "application/json,text/plain,*/*" }
      }
    );

    const body = await upstream.text();

    if (!upstream.ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).json({
        error: "Apps Script upstream error",
        status: upstream.status
      });
    }

    JSON.parse(body);

    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // SNAIL league data changes about once per week.
    // Keep a 20-day CDN cache for fast startup; purge Vercel cache whenever league data is updated.
    // managerName still comes dynamically from Teams sheet and is never hardcoded.
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=1728000, stale-while-revalidate=86400, stale-if-error=1728000");
    res.setHeader("CDN-Cache-Control", "public, max-age=1728000, stale-while-revalidate=86400, stale-if-error=1728000");
    res.setHeader("Vercel-CDN-Cache-Control", "public, max-age=1728000, stale-while-revalidate=86400, stale-if-error=1728000");
    res.setHeader("Vercel-Cache-Tag", "snail-fpl-data");
    res.setHeader("X-Snail-Cache-Policy", "shared-cdn-20d");

    return res.status(200).send(body);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "SNAIL API bridge failed",
      detail: String(error?.message || error)
    });
  }
}
