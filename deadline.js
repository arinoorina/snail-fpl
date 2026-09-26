export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 SNAIL-FPL-Countdown"
      }
    });

    if (!upstream.ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).json({
        error: "FPL deadline upstream error",
        status: upstream.status
      });
    }

    const data = await upstream.json();
    const events = Array.isArray(data && data.events) ? data.events : [];
    const now = Date.now();

    const next = events.find(function(event) {
      return event && event.is_next && Date.parse(event.deadline_time) > now;
    }) || events.find(function(event) {
      return event && Date.parse(event.deadline_time) > now;
    });

    if (!next || !next.deadline_time) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(404).json({ error: "No future FPL deadline found" });
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=300");
    res.setHeader("CDN-Cache-Control", "public, max-age=300, stale-while-revalidate=300");
    res.setHeader("Vercel-CDN-Cache-Control", "public, max-age=300, stale-while-revalidate=300");

    return res.status(200).json({
      gw: Number(next.id) || null,
      name: next.name || null,
      deadline_time: next.deadline_time
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "SNAIL deadline bridge failed",
      detail: String(error && error.message ? error.message : error)
    });
  }
}
