// BBS888 Hall of Fame - Cloudflare Worker
// /api/fpl = ดึงข้อมูล Fantasy Premier League (แคช 10 นาที)  /api/gas = proxy ไป Google Apps Script
const CORS = { 'access-control-allow-origin': '*' };
const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), {
  status: s, headers: { 'content-type': 'application/json', ...CORS, ...extra } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS,
      'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });

    if (url.pathname === '/api/fpl') {
      try {
        const r = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; BBS888-HOF)' }, cf: { cacheTtl: 600, cacheEverything: true } });
        if (!r.ok) return json({ error: 'FPL HTTP ' + r.status }, 502);
        const d = await r.json();
        return json({
          teams: d.teams.map(t => ({ id: t.id, s: t.short_name })),
          els: d.elements.map(e => ({ id: e.id, code: e.code, n: e.web_name, f: e.first_name, l: e.second_name, t: e.team,
            pos: e.element_type, pts: e.total_points, gls: e.goals_scored, ast: e.assists, cs: e.clean_sheets,
            sav: e.saves, bns: e.bonus, ict: +e.ict_index, frm: +e.form, min: e.minutes, cost: e.now_cost }))
        }, 200, { 'cache-control': 'public, max-age=300' });
      } catch (e) { return json({ error: 'ดึงข้อมูล FPL ไม่ได้: ' + e.message }, 502); }
    }

    if (url.pathname === '/api/gas') {
      if (req.method !== 'POST') return json({ status: 'ok' });
      try {
        const r = await fetch(env.GOOGLE_SCRIPT_URL, { method: 'POST', redirect: 'follow',
          headers: { 'content-type': 'text/plain;charset=utf-8' }, body: await req.text() });
        return new Response(await r.text(), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });
      } catch (e) { return json({ error: 'ติดต่อ Google Apps Script ไม่ได้: ' + e.message }, 502); }
    }
    return env.ASSETS.fetch(req);
  }
};
