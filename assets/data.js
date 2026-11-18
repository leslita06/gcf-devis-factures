/* Lecture des deux classeurs Google (données d'exemple). */
const SRC = {
  rel: "17YrurpqvL73OcIhPaLQabBnwNuLcICpyjP9emfWfxfo",
  tra: "1ReLWxUg04LBlfPUwwXSjS2U_pPjmGtxR_zKxF6O5tG4"
};
const RANGES = {
  param:    ["rel", "Paramètres", "C7:C8"],
  matin:    ["rel", "Ce matin", "B13:M60"],
  encaisser:["rel", "Factures à encaisser", "B9:Y30"],
  envoyes:  ["rel", "Devis envoyés", "B8:P40"],
  comp:     ["tra", "Devis comparés", "B12:T40"],
  demandes: ["tra", "Demandes", "B12:Y30"],
  mouv:     ["tra", "Mouvements", "B12:K40"],
  journal:  ["tra", "Journal des mouvements", "B12:L60"]
};

function gvizUrl(k) {
  const [book, sheet, range] = RANGES[k];
  return "https://docs.google.com/spreadsheets/d/" + SRC[book] + "/gviz/tq?tqx=out:json&headers=0&sheet=" +
    encodeURIComponent(sheet) + "&range=" + range + "&_=" + Date.now();
}
function parseGviz(txt) {
  const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
  return JSON.parse(txt.slice(a, b + 1));
}
function cellVal(c) {
  if (!c || c.v === null || c.v === undefined) return null;
  if (typeof c.v === "string") {
    const m = /^Date\((\d+),(\d+),(\d+)/.exec(c.v);
    if (m) return new Date(+m[1], +m[2], +m[3]);
  }
  return c.v;
}
function tableRows(js) {
  if (!js || js.status !== "ok") throw new Error("lecture");
  return js.table.rows.map(r => (r.c || []).map(cellVal));
}
async function loadAll() {
  const keys = Object.keys(RANGES);
  const out = {};
  await Promise.all(keys.map(async k => {
    let last;
    for (let t = 0; t < 3; t++) {
      try {
        const r = await fetch(gvizUrl(k), { cache: "no-store" });
        if (!r.ok) throw new Error(k);
        out[k] = tableRows(parseGviz(await r.text()));
        return;
      } catch (e) { last = e; await new Promise(s => setTimeout(s, 800 * (t + 1))); }
    }
    throw last;
  }));
  return { data: out, live: true };
}
