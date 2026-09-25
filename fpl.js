export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
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
