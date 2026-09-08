/**
 * Blast Radius: static game plus a public daily leaderboard.
 * Static assets are served by the platform; this Worker only handles /api/*.
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CTRL_RE = /[\x00-\x1F\x7F]/g;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

// Scores are bounded by the game's own arithmetic. Anything outside that band
// did not come from a real playthrough, so it does not go on the board.
function clean(body) {
  const day = String(body.day || "");
  if (!DAY_RE.test(day)) return { err: "bad day" };

  const who = String(body.who || "").replace(CTRL_RE, "").trim().slice(0, 18);
  if (!who) return { err: "handle required" };

  const score = Math.trunc(Number(body.score));
  if (!Number.isFinite(score) || score < -2000 || score > 2000) return { err: "score out of range" };

  const customers = Math.trunc(Number(body.customers));
  if (!Number.isFinite(customers) || customers < 0 || customers > 200000) return { err: "impact out of range" };

  const minsLeft = Math.trunc(Number(body.minsLeft));
  if (!Number.isFinite(minsLeft) || minsLeft < 0 || minsLeft > 30) return { err: "clock out of range" };

  return { day, who, score, customers, minsLeft, found: body.found ? 1 : 0 };
}

async function board(env, day) {
  const { results } = await env.DB.prepare(
    "SELECT who, score, found, customers, mins_left AS minsLeft FROM scores WHERE day = ? ORDER BY score DESC, at ASC LIMIT 12"
  ).bind(day).all();
  return results || [];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/board" && request.method === "GET") {
      const day = url.searchParams.get("day") || "";
      if (!DAY_RE.test(day)) return json({ error: "bad day" }, 400);
      try {
        return json({ day, rows: await board(env, day) });
      } catch (e) {
        return json({ error: "board unavailable" }, 503);
      }
    }

    if (url.pathname === "/api/score" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }

      const c = clean(body || {});
      if (c.err) return json({ error: c.err }, 400);

      try {
        await env.DB.prepare(
          "INSERT INTO scores (day, who, score, found, customers, mins_left, at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(c.day, c.who, c.score, c.found, c.customers, c.minsLeft, Date.now()).run();

        // One row per handle per day: the best run stands.
        await env.DB.prepare(
          "DELETE FROM scores WHERE day = ?1 AND who = ?2 AND id NOT IN (SELECT id FROM scores WHERE day = ?1 AND who = ?2 ORDER BY score DESC, at ASC LIMIT 1)"
        ).bind(c.day, c.who).run();

        return json({ ok: true, rows: await board(env, c.day) });
      } catch (e) {
        return json({ error: "could not post" }, 503);
      }
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);

    return env.ASSETS.fetch(request);
  }
};
