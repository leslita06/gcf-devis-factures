/* Galerie Cécile Fakhoury · Devis, factures et transports (démonstration) */
const NB = "\u00A0";
const fmtN = n => Math.round(n).toLocaleString("fr-FR").replace(/[\s\u202F\u00A0]/g, NB);
const F = n => fmtN(n) + NB + "F" + NB + "CFA";
const E = n => fmtN(n) + NB + "€";
const pad = x => String(x).padStart(2, "0");
const D = d => d instanceof Date ? pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() : (d || "");
const Dc = d => d instanceof Date ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : (d || "");
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ICB = "https://unpkg.com/lucide-static@0.460.0/icons/";
const ic = (n, cls) => `<span class="ic ${cls || ""}" style="-webkit-mask-image:url(${ICB}${n}.svg);mask-image:url(${ICB}${n}.svg)"></span>`;
const EX = `<span class="ex">Exemple</span>`;
const num = v => typeof v === "number" ? v : (v == null || v === "" ? null : Number(String(v).replace(/[^\d,.-]/g, "").replace(",", ".")));
const toDate = v => v instanceof Date ? v : (typeof v === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(v) ? new Date(+v.slice(6), +v.slice(3, 5) - 1, +v.slice(0, 2)) : null);
const chipOf = s => {
  const t = String(s || "");
  if (/transit/i.test(t)) return `<span class="chip blue">${ic("plane")}${esc(t)}</span>`;
  if (/proposition|reçus|recommand|accept|livr|fait|soldée|encaiss/i.test(t)) return `<span class="chip green">${ic("circle-check")}${esc(t)}</span>`;
  if (/attente|demandés|à faire|à venir/i.test(t)) return `<span class="chip ochre">${ic("clock")}${esc(t)}</span>`;
  if (/retard|perdu|non conforme|hors délai|écart/i.test(t)) return `<span class="chip red">${ic("triangle-alert")}${esc(t)}</span>`;
  return `<span class="chip">${esc(t)}</span>`;
};

let S = {};

function prepare(raw) {
  const p = raw.param;
  S.today = toDate(p[0] && p[0][0]) || new Date(2026, 10, 18);
  S.parite = num(p[1] && p[1][0]) || 655.957;
  S.matin = raw.matin.filter(r => typeof r[0] === "number" && r[1]);
  S.inv = raw.encaisser.filter(r => /^FV-/.test(r[0] || "")).map(r => {
    const eur = r[5] === "EUR", k = eur ? S.parite : 1;
    const ech = toDate(r[8]), reste = num(r[11]) || 0;
    return { n: r[0], client: r[1], type: r[2], lieu: r[3], objet: r[4], dev: r[5], ttc: num(r[6]), ttcF: num(r[6]) * k,
      emise: toDate(r[7]), ech, enc: num(r[9]) || 0, encF: (num(r[9]) || 0) * k, reste, resteF: reste * k,
      late: reste > 0 && ech && ech < S.today, solde: reste <= 0, etape: r[19], jr: num(r[21]) };
  });
  S.env = raw.envoyes.filter(r => /^DV-/.test(r[0] || "")).map(r => {
    const eur = r[5] === "EUR";
    return { n: r[0], client: r[1], type: r[2], lieu: r[3], objet: r[4], dev: r[5], mt: num(r[6]),
      F: eur ? num(r[6]) * S.parite : num(r[6]), env: toDate(r[7]), val: toDate(r[8]), st: r[9], dec: toDate(r[10]), note: r[11] };
  });
  S.comp = raw.comp.filter(r => /^T\d+/.test(r[0] || "")).map(r => ({ ref: r[0], trajet: r[1], tr: r[2], dem: toDate(r[3]), recu: toDate(r[4]),
    transport: num(r[5]), assur: num(r[6]), caisse: num(r[7]), tot: num(r[8]), totF: num(r[9]), delai: num(r[10]),
    assurP: r[11], caisseP: r[12], arr: toDate(r[13]), ok: r[14], conf: r[15], ecart: r[16], verd: r[17] }));
  S.dem = raw.demandes.filter(r => /^T\d+/.test(r[0] || "")).map(r => ({ ref: r[0], oeuvre: r[1], artiste: r[2], titre: r[3], dim: r[4],
    dep: r[5], arr: r[6], dest: r[7], demLe: toDate(r[8]), enl: toDate(r[9]), liv: toDate(r[10]), assur: r[11], caisse: r[12], st: r[13],
    nDem: num(r[14]), nRec: num(r[15]), reco: r[19], retenu: r[20], alerte: r[22] }));
  S.mouv = raw.mouv.filter(r => /^O\d+/.test(r[0] || "")).map(r => ({ ref: r[0], artiste: r[1], titre: r[2], lieu: r[3], precis: r[4], depuis: toDate(r[5]), tr: r[6], ctrl: r[9], base: r[8] }));
  S.jour = raw.journal.filter(r => typeof r[0] === "number" && r[4] && r[4] !== "Inventaire").map(r => ({ d: toDate(r[1]), ref: r[2], oeuvre: r[3], de: r[4], vers: r[5], precis: r[6], trf: r[7], tr: r[8], constat: r[9] }))
    .sort((a, b) => (b.d || 0) - (a.d || 0));
}

/* ---------------------------------------------------------------- Chiffres clés */
function kpis() {
  const late = S.matin.filter(r => num(r[7]) > 0).length;
  const reste = S.inv.reduce((s, i) => s + i.resteF, 0);
  const wait = S.comp.filter(c => c.tot == null).length;
  const transit = S.mouv.filter(m => /transit/i.test(m.lieu)).length;
  const att = S.env.filter(d => d.st === "En attente");
  return `<div class="kpis">
    <div class="kpi"><div class="l">${ic("calendar-check")}À faire aujourd'hui</div><div class="v">${S.matin.length}</div><div class="d">relances et paiements à valider</div></div>
    <div class="kpi alert"><div class="l">${ic("triangle-alert")}Dont en retard</div><div class="v">${late}</div><div class="d">à traiter en premier</div></div>
    <div class="kpi"><div class="l">${ic("banknote")}Reste à encaisser</div><div class="v">${(reste / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>M F CFA</small></div><div class="d">${E(reste / S.parite)} · exemple</div></div>
    <div class="kpi"><div class="l">${ic("file-text")}Devis envoyés en attente</div><div class="v">${att.length}</div><div class="d">${F(att.reduce((s, d) => s + d.F, 0))} · exemple</div></div>
    <div class="kpi"><div class="l">${ic("plane")}Œuvres en transit</div><div class="v">${transit}</div><div class="d">${wait} devis de transport attendus</div></div>
  </div>`;
}

/* ---------------------------------------------------------------- Ce matin */
function matin() {
  const groups = [
    ["Devis", "Devis à relancer", "send", "Prestataires qui n'ont pas répondu"],
    ["Encaisser", "Clients à relancer", "hand-coins", "Collectionneurs et institutions"],
    ["Payer", "Paiements à valider", "receipt", "Rien ne part sans bon à payer"]
  ];
  const cols = groups.map(([t, h, i]) => {
    const rows = S.matin.filter(r => r[1] === t).sort((a, b) => (num(b[7]) || 0) - (num(a[7]) || 0));
    const li = rows.map(r => {
      const lateN = num(r[7]) || 0;
      const amt = num(r[8]) ? `<div class="m">${F(num(r[8]))}<small>${E(num(r[9]))}</small></div>` : `<div class="m"></div>`;
      return `<li class="${lateN > 0 ? "late" : ""}"><div class="t">${esc(r[3])}</div>${amt}
        <div class="o">${esc(r[2])} · ${esc(r[4])}</div>
        <div class="a"><span>${ic("arrow-right")} ${esc(r[5])}</span>${lateN > 0 ? `<span class="chip red">${lateN} j de retard</span>` : `<span class="chip ochre">aujourd'hui</span>`}<span class="chip">${ic(r[10] === "WhatsApp" ? "send" : "mail")}${esc(r[10])}</span></div></li>`;
    }).join("");
    return `<div class="mcol"><h3>${ic(i)}${h}<span class="c">${rows.length}</span></h3><ul class="todo">${li || `<li class="empty">Rien aujourd'hui.</li>`}</ul></div>`;
  }).join("");
  return `<section class="blk" id="matin"><div class="bh"><div><div class="n">01</div><h2>Ce matin${EX}</h2></div>
    <div class="hint">Ce qu'il faut relancer ou valider aujourd'hui. Les messages sont prêts dans le classeur Relances : chacun attend une relecture avant d'être envoyé.</div></div>
    <div class="matin">${cols}</div></section>`;
}

/* ---------------------------------------------------------------- Comparateur */
function compSection() {
  const refs = S.dem.map(d => d.ref);
  const withTwo = S.dem.find(d => S.comp.filter(c => c.ref === d.ref && c.tot != null).length === 2);
  S.sel = S.sel || (withTwo ? withTwo.ref : refs[0]);
  const btns = S.dem.map(d => {
    const n = S.comp.filter(c => c.ref === d.ref && c.tot != null).length;
    return `<button data-ref="${d.ref}" class="${d.ref === S.sel ? "on" : ""}">${d.ref} · ${esc(d.dep.split(",")[0])} → ${esc(d.arr.split(",")[0])} <span style="opacity:.6">(${n}/${d.nDem})</span></button>`;
  }).join("");
  return `<section class="blk" id="devis-transport"><div class="bh"><div><div class="n">02</div><h2>Devis de transport${EX}</h2></div>
    <div class="hint">Les devis reçus d'une même demande, côte à côte. Le moins cher et le plus rapide sont signalés ; le recommandé est le moins cher parmi les devis conformes et dans les délais.</div></div>
    <div class="seg" id="seg">${btns}</div><div id="cmp"></div></section>`;
}
function renderComp() {
  const d = S.dem.find(x => x.ref === S.sel);
  const qs = S.comp.filter(c => c.ref === S.sel);
  const got = qs.filter(q => q.tot != null);
  const minP = got.length ? Math.min(...got.map(q => q.tot)) : null;
  const minD = got.length ? Math.min(...got.map(q => q.delai)) : null;
  const cards = qs.map(q => {
    if (q.tot == null) return `<div class="q wait"><div class="who">${ic("truck")}${esc(q.tr)}</div><div class="badges"><span class="chip ochre">${ic("clock")}Devis attendu</span></div>
      <div class="tot">En attente</div><div class="fc">Demandé le ${D(q.dem)}, relance prévue dans le classeur Relances.</div></div>`;
    const cheap = got.length > 1 && q.tot === minP, fast = got.length > 1 && q.delai === minD;
    const badges = [cheap ? `<span class="chip ink">${ic("banknote")}Le moins cher</span>` : "", fast ? `<span class="chip blue">${ic("timer")}Le plus rapide</span>` : ""].join("");
    return `<div class="q ${cheap ? "best" : ""}"><div class="who">${ic("truck")}${esc(q.tr)}</div><div class="badges">${badges}</div>
      <div class="tot">${E(q.tot)}<small>TTC</small></div><div class="fc">${F(q.totF)} · <span class="ex" style="margin:0">Exemple</span></div>
      <dl><dt>Délai porte à porte</dt><dd>${q.delai} jours</dd>
      <dt>Arrivée estimée</dt><dd>${D(q.arr)}</dd>
      <dt>Transport</dt><dd>${E(q.transport)}</dd>
      <dt>Assurance</dt><dd class="${q.conf === "Non" ? "no" : ""}">${esc(q.assurP)} · ${E(q.assur)}</dd>
      <dt>Caisse</dt><dd>${esc(q.caisseP)} · ${E(q.caisse)}</dd>
      <dt>Conditions</dt><dd class="${q.ok === "Non" || q.conf === "Non" ? "no" : ""}">${q.ok === "Oui" ? "Dans les délais" : "Hors délai"}, ${q.conf === "Oui" ? "conforme" : "non conforme"}</dd></dl>
      <div class="verd">${chipOf(q.verd)}${q.ecart && q.ecart !== "0 %" && q.ecart !== 0 ? `<span style="color:var(--mute)">${typeof q.ecart === "number" ? "+" + Math.round(q.ecart * 100) + " %" : esc(q.ecart)} vs le moins cher</span>` : ""}</div></div>`;
  }).join("");
  document.getElementById("cmp").innerHTML = `<div class="dmd"><div class="oe">${esc(d.artiste)}, ${esc(d.titre)}</div>
    <span>${ic("route")} <b>${esc(d.dep)}</b> → <b>${esc(d.arr)}</b></span><span>${ic("frame")} ${esc(d.dim)} cm</span>
    <span>${ic("shield-check")} Demandé : ${esc(d.assur)}, ${esc(d.caisse).toLowerCase()}</span><span>${ic("calendar-check")} Livraison au plus tard le ${D(d.liv)}</span>
    <span>${chipOf(d.st)}</span>${d.alerte ? `<span class="chip red">${ic("triangle-alert")}${esc(d.alerte)}</span>` : ""}</div><div class="cmp">${cards}</div>`;
  document.querySelectorAll("#seg button").forEach(b => b.classList.toggle("on", b.dataset.ref === S.sel));
}

/* ---------------------------------------------------------------- Mouvements */
const CITY = { Paris: [2.35, 48.86], Dakar: [-17.45, 14.69], Abidjan: [-4.01, 5.35] };
function proj([lon, lat]) { return [70 + (lon + 22) * 15.5, 48 + (52 - lat) * 8.4]; }
function mapSvg() {
  const W = 520, H = 470;
  const pt = {}; Object.keys(CITY).forEach(c => pt[c] = proj(CITY[c]));
  const cityOf = s => Object.keys(CITY).find(c => String(s).indexOf(c) === 0);
  const counts = {}; S.mouv.forEach(m => { const c = cityOf(m.lieu) || (/collection/i.test(m.lieu) ? cityOf(m.precis.replace(/.*,\s*/, "")) : null); if (c) counts[c] = (counts[c] || 0) + 1; });
  const pairs = {};
  const arcs = S.dem.map(d => {
    const a = cityOf(d.dep), b = cityOf(d.arr); if (!a || !b) return "";
    const key = [a, b].sort().join("-"); pairs[key] = (pairs[key] || 0) + 1;
    const k = pairs[key];
    const [x1, y1] = pt[a], [x2, y2] = pt[b];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    const bend = (a < b ? 1 : -1) * (26 + 20 * (k - 1));
    const cx = mx - dy / L * bend, cy = my + dx / L * bend;
    const tr = /transit/i.test(d.st), ok = /proposition|reçus/i.test(d.st);
    const col = tr ? "#24466E" : ok ? "#1B6E46" : "#9A6B1F";
    const dash = tr ? "" : ok ? "" : 'stroke-dasharray="5 5"';
    // étiquette au milieu de la courbe
    const t0 = [.5, .3, .7][(k - 1) % 3], t = a < b ? t0 : 1 - t0;
    const lx = (1 - t) * (1 - t) * x1 + 2 * t * (1 - t) * cx + t * t * x2, ly = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * cy + t * t * y2;
    const ang = Math.atan2(y2 - cy, x2 - cx);
    const ax = x2 - Math.cos(ang) * 16, ay = y2 - Math.sin(ang) * 16;
    const arrow = `<path d="M${ax},${ay} l${-Math.cos(ang - .45) * 9},${-Math.sin(ang - .45) * 9} M${ax},${ay} l${-Math.cos(ang + .45) * 9},${-Math.sin(ang + .45) * 9}" stroke="${col}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    return `<path d="M${x1},${y1} Q${cx},${cy} ${ax},${ay}" fill="none" stroke="${col}" stroke-width="${tr ? 2.4 : 1.6}" ${dash}/>${arrow}
      <g><rect x="${lx - 15}" y="${ly - 10}" width="30" height="19" rx="9.5" fill="#fff" stroke="${col}" stroke-width="1"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-family="Inter" font-size="10.5" font-weight="600" fill="${col}">${d.ref}</text></g>`;
  }).join("");
  const nodes = Object.keys(CITY).map(c => {
    const [x, y] = pt[c], n = counts[c] || 0, left = c !== "Abidjan";
    return `<circle cx="${x}" cy="${y}" r="9" fill="#111"/><circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#111" stroke-width="1" opacity=".25"/>
      <text x="${x + (left ? -22 : 22)}" y="${y - 4}" text-anchor="${left ? "end" : "start"}" font-family="Cormorant, Georgia, serif" font-size="26" font-weight="500" fill="#111">${c}</text>
      <text x="${x + (left ? -22 : 22)}" y="${y + 16}" text-anchor="${left ? "end" : "start"}" font-family="Inter" font-size="12" fill="#6E6A63">${n} œuvre${n > 1 ? "s" : ""} sur place</text>`;
  }).join("");
  // repères géographiques discrets
  const grid = [10, 20, 30, 40, 50].map(lat => { const y = proj([0, lat])[1]; return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="#E6E2DA" stroke-width="1" stroke-dasharray="2 6"/>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Carte des transports entre Paris, Dakar et Abidjan">${grid}
    <text x="12" y="${proj([0, 30])[1] - 6}" font-family="Inter" font-size="10" fill="#A29E96">Méditerranée · Sahara</text>
    <text x="${12}" y="${H - 14}" font-family="Inter" font-size="10" fill="#A29E96">Golfe de Guinée</text>${arcs}${nodes}</svg>`;
}
function mouvements() {
  const cityCount = c => S.mouv.filter(m => m.lieu === c).length;
  const transit = S.mouv.filter(m => /transit/i.test(m.lieu)).length;
  const coll = S.mouv.filter(m => /collection/i.test(m.lieu)).length;
  const trs = S.dem.map(d => `<li><div class="r">${d.ref}</div><div class="w">${esc(d.artiste)}, ${esc(d.titre)}</div>
    <div class="s">${chipOf(d.st)}</div><div class="p">${esc(d.dep)} → ${esc(d.arr)} · enlèvement le ${D(d.enl)}${d.retenu ? " · " + esc(d.retenu) : d.reco ? " · recommandé : " + esc(d.reco) : ""}</div></li>`).join("");
  const fr = S.jour.map(j => `<li><div class="d">${Dc(j.d)}</div><div class="w">${esc(j.oeuvre)}</div>
    <div class="x">${ic("map-pin")} ${esc(j.de)} → ${esc(j.vers)} · ${esc(j.precis)}${j.tr ? ` · ${esc(j.tr)} (${esc(j.trf)})` : ""} ${j.constat === "À faire" ? `<span class="chip red">${ic("triangle-alert")}Constat d'état à faire</span>` : `<span class="chip green">${ic("circle-check")}Constat fait</span>`}</div></li>`).join("");
  const ecarts = S.mouv.filter(m => m.ctrl === "Écart");
  return `<section class="blk" id="mouvements"><div class="bh"><div><div class="n">03</div><h2>Mouvements d'œuvres</h2></div>
    <div class="hint">Où se trouve chaque œuvre d'après le journal de la régie, et les transports en cours entre Paris, Dakar et Abidjan.</div></div>
    <div class="cities"><div><b>${cityCount("Paris")}</b><span>à Paris</span></div><div><b>${cityCount("Dakar")}</b><span>à Dakar</span></div><div><b>${cityCount("Abidjan")}</b><span>à Abidjan</span></div><div><b>${transit}</b><span>en transit</span></div><div><b>${coll}</b><span>chez un collectionneur</span></div></div>
    <div class="mv"><div><div class="map">${mapSvg()}</div>
      <div class="legend"><span><i style="border-color:#24466E"></i>En transit</span><span><i style="border-color:#1B6E46"></i>Devis reçus ou proposition envoyée</span><span><i style="border-color:#9A6B1F;border-top-style:dashed"></i>Devis demandés</span></div></div>
      <div><h3>Transports en cours</h3><ul class="trs">${trs}</ul></div></div>
    <div class="frise"><h3>Derniers mouvements</h3><ul class="fr">${fr}</ul>
    ${ecarts.length ? `<p style="margin-top:6px;font-size:13px;color:var(--mute)">${ic("info")} ${ecarts.length} œuvre${ecarts.length > 1 ? "s" : ""} dont le lieu diffère de la base de la galerie : ${ecarts.map(m => esc(m.artiste + ", " + m.titre)).join(" ; ")}.</p>` : ""}</div></section>`;
}

/* ---------------------------------------------------------------- Factures */
function factures() {
  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const emisF = sum(S.inv, "ttcF"), encF = sum(S.inv, "encF"), resteF = sum(S.inv, "resteF");
  const lateArr = S.inv.filter(i => i.late), lateF = sum(lateArr, "resteF");
  const box = (cls, i, l, f, sub) => `<div class="fs ${cls}"><div class="l">${ic(i)}${l}</div><div class="v">${F(f)}</div><div class="e">${E(f / S.parite)} · ${sub}</div></div>`;
  const rows = S.inv.slice().sort((a, b) => (b.late - a.late) || (a.ech - b.ech)).map(i => {
    const st = i.solde ? `<span class="chip green">${ic("circle-check")}Encaissée</span>` : i.late ? `<span class="chip red">${ic("triangle-alert")}En retard de ${i.jr} j</span>` : i.enc > 0 ? `<span class="chip blue">Acompte reçu</span>` : `<span class="chip ochre">${ic("clock")}À échoir</span>`;
    const cur = v => i.dev === "EUR" ? E(v) : F(v);
    return `<tr><td data-l="Facture"><b>${esc(i.n)}</b><small>${esc(i.client)} · ${esc(i.lieu)}</small></td>
      <td data-l="Objet">${esc(i.objet)}</td><td data-l="Échéance">${D(i.ech)}</td>
      <td class="num" data-l="Montant">${cur(i.ttc)}<small>${i.dev === "EUR" ? F(i.ttcF) : E(i.ttcF / S.parite)}</small></td>
      <td class="num" data-l="Encaissé">${cur(i.enc)}</td>
      <td class="num" data-l="Reste">${cur(i.reste)}<small>${i.dev === "EUR" ? F(i.resteF) : E(i.resteF / S.parite)}</small></td>
      <td data-l="Statut">${st}${!i.solde && i.etape ? `<small style="margin-top:5px">Prochaine étape : ${esc(String(i.etape).toLowerCase())}</small>` : ""}</td></tr>`;
  }).join("");
  return `<section class="blk" id="factures"><div class="bh"><div><div class="n">04</div><h2>Factures${EX}</h2></div>
    <div class="hint">Factures émises aux collectionneurs et aux institutions. Montants en francs CFA et en euros, parité fixe de 655,957 F CFA pour 1 euro.</div></div>
    <div class="fsum">${box("", "file-text", "Émises", emisF, S.inv.length + " factures")}${box("green", "circle-check", "Encaissées", encF, "paiements reçus")}${box("", "hand-coins", "Reste à encaisser", resteF, S.inv.filter(i => !i.solde).length + " factures ouvertes")}${box("red", "triangle-alert", "En retard", lateF, lateArr.length + " factures échues")}</div>
    <table class="tbl"><thead><tr><th>Facture</th><th>Objet</th><th>Échéance</th><th class="num">Montant</th><th class="num">Encaissé</th><th class="num">Reste</th><th>Statut</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td data-l="Total">Total</td><td></td><td></td><td class="num" data-l="Émis">${F(emisF)}<small>${E(emisF / S.parite)}</small></td><td class="num" data-l="Encaissé">${F(encF)}</td><td class="num" data-l="Reste">${F(resteF)}<small>${E(resteF / S.parite)}</small></td><td></td></tr></tfoot></table></section>`;
}

/* ---------------------------------------------------------------- Devis envoyés */
function envoyes() {
  const cols = [["En attente", "Fr En attente", "clock", "ochre"], ["Accepté", "Acceptés", "circle-check", "green"], ["Perdu", "Perdus", "triangle-alert", "red"]];
  const html = cols.map(([st, , i]) => {
    const arr = S.env.filter(d => d.st === st);
    const tot = arr.reduce((s, d) => s + d.F, 0);
    const label = st === "En attente" ? "En attente" : st === "Accepté" ? "Acceptés" : "Perdus";
    const items = arr.map(d => {
      const left = d.val ? Math.round((d.val - S.today) / 864e5) : null;
      const x = st === "En attente" ? `<span class="chip ${left <= 10 ? "red" : "ochre"}">${ic("clock")}valable encore ${left} j</span>` : `<span>${st === "Accepté" ? "accepté" : "perdu"} le ${D(d.dec)}</span>`;
      return `<div class="dv"><div class="t">${esc(d.client)}<span>${d.dev === "EUR" ? E(d.mt) : F(d.mt)}</span></div>
        <div class="o">${esc(d.n)} · ${esc(d.objet)}</div><div class="x">${ic("map-pin")} ${esc(d.lieu)} · envoyé le ${D(d.env)} ${x}${d.note ? `<span style="color:var(--mute)">· ${esc(d.note)}</span>` : ""}</div></div>`;
    }).join("");
    return `<div class="col"><h3>${ic(i)}${label}</h3><div class="sum">${arr.length} devis · ${F(tot)}<small>${E(tot / S.parite)}</small></div>${items || `<div class="empty">Aucun.</div>`}</div>`;
  }).join("");
  const dec = S.env.filter(d => d.st !== "En attente"), won = dec.filter(d => d.st === "Accepté");
  const taux = dec.length ? Math.round(100 * won.length / dec.length) : 0;
  return `<section class="blk" id="devis-envoyes"><div class="bh"><div><div class="n">05</div><h2>Devis envoyés${EX}</h2></div>
    <div class="hint">Devis adressés aux collectionneurs et aux institutions. ${won.length} acceptés sur ${dec.length} décidés, soit ${taux} %.</div></div>
    <div class="kb">${html}</div></section>`;
}

/* ---------------------------------------------------------------- Rendu */
async function main() {
  const res = await loadAll();
  prepare(res.data);
  document.getElementById("asof").textContent = "Situation au " + S.today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  document.getElementById("src").textContent = res.live ? "Lu en direct dans les classeurs" : "Copie des classeurs du " + (res.copie || "");
  document.getElementById("dot").classList.toggle("off", !res.live);
  document.getElementById("app").innerHTML = `<div class="intro"><div class="kick">Devis · Factures · Transports</div>
    <h1>Le tableau de la semaine</h1><p class="lede">Ce qu'il faut relancer ce matin, les devis de transport à comparer, où sont les œuvres et ce qui reste à encaisser. Les chiffres viennent des classeurs Relances et Transports ; toute mise à jour y apparaît ici.</p></div>
    ${kpis()}${matin()}${compSection()}${mouvements()}${factures()}${envoyes()}`;
  renderComp();
  document.getElementById("seg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.sel = b.dataset.ref; renderComp(); });
}
main().catch(err => { document.getElementById("app").innerHTML = `<div class="loading">Les données n'ont pas pu être lues. Rechargez la page dans un instant.</div>`; console.error(err); });
