/* Meridian v0.5 logic: question generators, no-repeat picking, race rules, bots. No DOM here. */
var CATS = {
  sci:{ name:"Science", col:"#b49cff" }, geo:{ name:"Geography", col:"#5ad6a0" }, mus:{ name:"Music", col:"#ff8fc7" },
  film:{ name:"Film", col:"#ff9d5c" }, lit:{ name:"Literature", col:"#e3d3a8" }, space:{ name:"Space", col:"#8fb8ff" },
  comp:{ name:"Computing", col:"#6ff0c8" }, hist:{ name:"History", col:"#e0a47a" },
  math:{ name:"Maths", col:"#ffd166" }, chess:{ name:"Chess", col:"#f2f2f2" }, grid:{ name:"Word grid", col:"#ffb43d" }, map:{ name:"Map", col:"#5ad6a0" }
};
var TRIVIA = ["sci","geo","mus","film","lit","space","comp","hist"];
var DIFFS = {
  easy:     { name:"Easy",     tiers:[1,1,1,2], know: .10, up:.75, down:1.0 },
  standard: { name:"Standard", tiers:[1,2,2,3], know: 0,   up:1.0, down:1.0 },
  hard:     { name:"Hard",     tiers:[2,3,3,3], know:-.10, up:1.25, down:.8 }
};
function recommendedDiff(D){ return D < 40 ? "easy" : D < 70 ? "standard" : "hard"; }

/* ---------- random ---------- */
function rng32(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b){ return a + Math.floor(r() * (b - a + 1)); }
function shuffleR(arr, r){ var a = arr.slice(); for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function pick(r, arr){ return arr[Math.floor(r() * arr.length)]; }
function hashStr(s){ var h = 2166136261; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 1); }
function newSeed(){ return (Math.random() * 2147483647) | 0; }

/* ---------- maths ---------- */
function mathQ(r, tier){
  var q, a, f, sp = 10, t, x, y, n, p, b, k, d, nu, m, c;
  if (tier === 1){
    t = ri(r, 0, 3);
    if (t === 0){ x = ri(r, 12, 49); y = ri(r, 11, 39); q = x + " + " + y; a = x + y; f = q + " = " + a; }
    else if (t === 1){ x = ri(r, 30, 89); y = ri(r, 11, 29); q = x + " − " + y; a = x - y; f = q + " = " + a; }
    else if (t === 2){ x = ri(r, 3, 12); y = ri(r, 3, 12); q = x + " × " + y; a = x * y; f = q + " = " + a; sp = x; }
    else { n = ri(r, 11, 99) * 2; q = "half of " + n; a = n / 2; f = n + " ÷ 2 = " + a; sp = 5; }
  } else if (tier === 2){
    t = ri(r, 0, 4);
    if (t === 0){ x = ri(r, 13, 29); y = ri(r, 3, 9); q = x + " × " + y; a = x * y; f = x + " × " + y + " = " + (x - x % 10) * y + " + " + (x % 10) * y + " = " + a; sp = y; }
    else if (t === 1){ p = pick(r, [10, 20, 25, 50]); n = ri(r, 2, 20) * 20; q = p + "% of " + n; a = p * n / 100; f = p + "% of " + n + " = " + n + " × " + (p / 100) + " = " + a; sp = Math.max(2, Math.round(a / 5)); }
    else if (t === 2){ n = ri(r, 11, 15); q = n + "²"; a = n * n; f = n + " × " + n + " = " + a; sp = n; }
    else if (t === 3){ b = ri(r, 3, 12); k = ri(r, 6, 15); q = (b * k) + " ÷ " + b; a = k; f = b + " × " + k + " = " + (b * k); sp = 1; }
    else { x = ri(r, 2, 9) * 10 + 5; y = ri(r, 2, 9); q = x + " × " + y; a = x * y; f = (x - 5) + " × " + y + " + 5 × " + y + " = " + a; sp = y; }
  } else {
    t = ri(r, 0, 4);
    if (t === 0){ p = pick(r, [15, 35, 45, 65]); n = ri(r, 2, 20) * 20; q = p + "% of " + n; a = p * n / 100; f = "10% of " + n + " is " + (n / 10) + ", so " + p + "% is " + a; sp = Math.max(2, Math.round(a / 6)); }
    else if (t === 1){ x = ri(r, 13, 29); y = ri(r, 11, 19); q = x + " × " + y; a = x * y; f = x + " × " + y + " = " + x + " × 10 + " + x + " × " + (y - 10) + " = " + a; }
    else if (t === 2){ n = ri(r, 16, 25); q = n + "²"; a = n * n; f = n + " × " + n + " = " + a; sp = 2 * n - 1; }
    else if (t === 3){ d = pick(r, [8, 6, 5, 4]); nu = pick(r, ({8:[1,3,5,7],6:[1,5],5:[1,2,3,4],4:[1,3]})[d]); k = ri(r, 3, 12); n = d * k; q = nu + "/" + d + " of " + n; a = nu * k; f = n + " ÷ " + d + " = " + k + ", × " + nu + " = " + a; sp = k; }
    else { m = ri(r, 3, 9); x = ri(r, 3, 12); c = ri(r, 2, 20); return mathFinish(r, "Solve for x: " + m + "x + " + c + " = " + (m * x + c), x, "Subtract " + c + ", then divide by " + m + ": x = " + x, 1); }
  }
  return mathFinish(r, "What is " + q + "?", a, f, sp);
}
function mathFinish(r, text, a, f, sp){
  var offs = shuffleR([sp, -sp, 1, -1, 2, -2, 10, -10, 2 * sp], r), w = [];
  for (var i = 0; i < offs.length && w.length < 3; i++){ var v = a + offs[i]; if (v > 0 && v !== a && w.indexOf(v) < 0) w.push(v); }
  while (w.length < 3) w.push(a + 3 + w.length * 7);
  return { kind:"text", cat:"math", q:text, a:String(a), w:w.map(String), fact:f, alt:"" };
}

/* ---------- word grid ---------- */
var THEMES = {
  element:{ label:"chemical element", words:["CARBON","OXYGEN","HELIUM","SILVER","COPPER","COBALT","NICKEL","SODIUM","IODINE","RADIUM","ARGON","XENON","BORON","CALCIUM","LITHIUM","URANIUM","SULFUR","KRYPTON"] },
  space:{ label:"space word", words:["MERCURY","VENUS","SATURN","URANUS","PLUTO","COMET","NEBULA","QUASAR","PULSAR","GALAXY","ECLIPSE","METEOR","ORBIT","NEPTUNE","AURORA"] },
  chess:{ label:"chess word", words:["KNIGHT","BISHOP","CASTLE","CHECK","QUEEN","GAMBIT","ENDGAME","TEMPO","OPENING","PROMOTE","FORK","PIN"].filter(function(w){ return w.length >= 5; }) },
  code:{ label:"computing word", words:["PYTHON","KERNEL","BINARY","PIXEL","ARRAY","SYNTAX","BUFFER","CACHE","SERVER","ROUTER","LAPTOP","CURSOR","MODEM","SCRIPT"] },
  country:{ label:"country", words:["FRANCE","SPAIN","CHINA","JAPAN","BRAZIL","CANADA","MEXICO","NORWAY","SWEDEN","EGYPT","KENYA","CHILE","INDIA","ITALY","GREECE","POLAND","NEPAL"] }
};
var LETTERS = "EEEEEEEAAAAAIIIIOOOOONNNNRRRRTTTTLLLSSSUUDDDGGBBCCMMPPFFHHVWWYKJXQZ";
var DIRS_EASY = [[1,0],[0,1]], DIRS_MID = [[1,0],[0,1],[1,1],[1,-1]], DIRS_ALL = [[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]];
function gridFind(g, n, word){ // returns list of placements of word in all 8 directions
  var hits = [];
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) for (var d = 0; d < 8; d++){
    var dx = DIRS_ALL[d][0], dy = DIRS_ALL[d][1], ok = true;
    for (var k = 0; k < word.length; k++){ var xx = x + dx * k, yy = y + dy * k; if (xx < 0 || yy < 0 || xx >= n || yy >= n || g[yy * n + xx] !== word[k]){ ok = false; break; } }
    if (ok) hits.push([x, y, dx, dy]);
  }
  return hits;
}
function gridQ(r, tier){
  var n = tier === 1 ? 6 : tier === 2 ? 7 : 8, dirs = tier === 1 ? DIRS_EASY : tier === 2 ? DIRS_MID : DIRS_ALL;
  for (var attempt = 0; attempt < 200; attempt++){
    var tk = pick(r, Object.keys(THEMES)), th = THEMES[tk];
    var word = pick(r, th.words.filter(function(w){ return w.length <= n; }));
    var g = new Array(n * n).fill(""), d = pick(r, dirs), dx = d[0], dy = d[1], L = word.length;
    var xs = [], ys = [];
    for (var i = 0; i < n; i++){ if (i + dx * (L - 1) >= 0 && i + dx * (L - 1) < n) xs.push(i); if (i + dy * (L - 1) >= 0 && i + dy * (L - 1) < n) ys.push(i); }
    var x0 = pick(r, xs), y0 = pick(r, ys), cells = [];
    for (var k = 0; k < L; k++){ g[(y0 + dy * k) * n + x0 + dx * k] = word[k]; cells.push((y0 + dy * k) * n + x0 + dx * k); }
    for (var c = 0; c < n * n; c++) if (!g[c]) g[c] = LETTERS[Math.floor(r() * LETTERS.length)];
    // the answer must appear exactly once, and no other word from the theme may appear anywhere
    if (gridFind(g, n, word).length !== 1) continue;
    var clash = th.words.some(function(w){ return w !== word && gridFind(g, n, w).length; });
    if (clash) continue;
    return { kind:"grid", cat:"grid", q:"Find the hidden " + th.label + " (" + L + " letters).", a:word, alt:"", grid:g.join(""), n:n, cells:cells,
             fact: word + " runs " + (dy === 0 ? (dx > 0 ? "left to right" : "right to left") : dx === 0 ? (dy > 0 ? "downwards" : "upwards") : "diagonally") + ".", typed:true };
  }
  return null;
}

/* ---------- map ---------- */
var REGIONS = {
  europe:{ name:"Europe", box:[-12, 34, 35, 62], ids:["FR","ES","DE","IT","PL","UA","RO","HU","CZ","AT","CH","NL","BE","PT","IE","GB","GR","BG","RS","HR","SE","NO","FI","DK","BY","LT","LV","SK","BA"] },
  samerica:{ name:"South America", box:[-85, -56, -32, 13], ids:["BR","AR","CL","PE","CO","VE","BO","PY","UY","EC","GY","SR"] },
  africa:{ name:"Africa", box:[-19, -36, 53, 38], ids:["EG","LY","DZ","MA","NG","ET","KE","TZ","ZA","CD","AO","ML","NE","TD","SD","SO","MG","NA","BW","ZM","ZW","MZ","GH","CM","SS","MR","TN","UG","CF"] },
  asia:{ name:"Asia", box:[60, -11, 150, 55], ids:["CN","IN","MN","KZ","PK","TH","VN","MM","MY","ID","JP","KR","KP","PH","LA","KH","NP","BD","AF","UZ","TM","KG","TJ"] },
  mideast:{ name:"Middle East", box:[25, 12, 64, 43], ids:["SA","IR","IQ","SY","JO","YE","OM","TR","AF","AE","IL","LB","KW","QA"] },
  namerica:{ name:"North America", box:[-170, 7, -50, 75], ids:["US","CA","MX","GT","CU","HN","NI","PA","CR","BZ"] }
};
function geoIndex(fc){ // {ISO2: feature}
  var idx = {}; if (!fc || !fc.features) return idx;
  fc.features.forEach(function(f){ var id = (f.id || (f.properties && (f.properties.id || f.properties.iso_a2)) || "").toUpperCase(); if (id) idx[id] = f; });
  return idx;
}
function geoName(f){ return (f.properties && (f.properties.name || f.properties.NAME)) || f.id; }
function mapQ(r, gidx){
  var keys = Object.keys(REGIONS);
  for (var tries = 0; tries < 30; tries++){
    var rk = pick(r, keys), R = REGIONS[rk], ids = R.ids.filter(function(id){ return gidx[id]; });
    if (ids.length < 4) continue;
    var id = pick(r, ids);
    return { kind:"map", cat:"map", region:rk, target:id, q:"Tap " + geoName(gidx[id]) + ".", a:geoName(gidx[id]), fact:geoName(gidx[id]) + " is highlighted in green.", typed:false };
  }
  return null;
}
// projection for a region box onto w×h pixels (equirectangular, scaled by cos of mid latitude), centred
function makeProj(box, w, h){
  var lon0 = box[0], lat0 = box[1], lon1 = box[2], lat1 = box[3], k = Math.cos((lat0 + lat1) / 2 * Math.PI / 180);
  var gw = (lon1 - lon0) * k, gh = (lat1 - lat0), s = Math.min(w / gw, h / gh);
  var ox = (w - gw * s) / 2, oy = (h - gh * s) / 2;
  return {
    fwd:function(lon, lat){ return [ox + (lon - lon0) * k * s, oy + (lat1 - lat) * s]; },
    inv:function(x, y){ return [(x - ox) / (k * s) + lon0, lat1 - (y - oy) / s]; }
  };
}
function polysOf(f){ var g = f.geometry; if (!g) return []; return g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []; }
function inRing(pt, ring){ var x = pt[0], y = pt[1], inside = false; for (var i = 0, j = ring.length - 1; i < ring.length; j = i++){ var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
function inFeature(lonlat, f){ return polysOf(f).some(function(poly){ if (!inRing(lonlat, poly[0])) return false; for (var h = 1; h < poly.length; h++) if (inRing(lonlat, poly[h])) return false; return true; }); }
function distToFeaturePx(px, f, proj){
  var best = Infinity;
  polysOf(f).forEach(function(poly){ poly.forEach(function(ring){
    for (var i = 1; i < ring.length; i++){
      var a = proj.fwd(ring[i - 1][0], ring[i - 1][1]), b = proj.fwd(ring[i][0], ring[i][1]);
      var vx = b[0] - a[0], vy = b[1] - a[1], wx = px[0] - a[0], wy = px[1] - a[1], L = vx * vx + vy * vy, t = L ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / L)) : 0;
      var dx = wx - t * vx, dy = wy - t * vy, d = Math.sqrt(dx * dx + dy * dy); if (d < best) best = d;
    }
  }); });
  return best;
}
// correct if the tap is inside the country, or within `tol` pixels of its border
function mapHit(px, f, proj, tol){ return inFeature(proj.inv(px[0], px[1]), f) || distToFeaturePx(px, f, proj) <= tol; }

/* ---------- typed-answer matching ---------- */
function nrm(s){
  return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().replace(/^(the|a|an) /, "");
}
function lev(a, b){
  if (a === b) return 0; var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  var prev = [], cur, i, j; for (j = 0; j <= n; j++) prev[j] = j;
  for (i = 1; i <= m; i++){ cur = [i]; for (j = 1; j <= n; j++){ cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); } prev = cur; }
  return prev[n];
}
var NUMWORDS = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12 };
function typedMatches(input, answer, alt, exact){
  var x = nrm(input); if (!x) return false;
  if (NUMWORDS[x] !== undefined) x = String(NUMWORDS[x]);
  if (/^\d+ 0+$/.test(x)) x = x.split(" ")[0];          // "9.0" -> "9"
  var xs = x.replace(/ /g, "");
  var cands = [answer].concat(alt ? String(alt).split("|") : []).map(nrm).filter(Boolean);
  for (var i = 0; i < cands.length; i++){
    var cs = cands[i].replace(/ /g, "");
    if (/^\d+$/.test(cs)) { if (xs === cs) return true; continue; }
    var tol = exact ? 0 : cs.length >= 9 ? 2 : cs.length >= 5 ? 1 : 0;
    if (lev(xs, cs) <= tol) return true;
  }
  return false;
}

/* ---------- picking questions (spec) and building them ---------- */
// A spec is a tiny, shareable description; buildQ turns it into the same question on every device.
function chooseSpec(r, diff, seen, opts){
  opts = opts || {};
  var roll = r(), tier = pick(r, DIFFS[diff].tiers), s = (r() * 2147483647) | 0;
  if (roll < 0.12) return { t:"ma", s:s, tier:tier };
  if (roll < 0.24) return { t:"gr", s:s, tier:tier };
  if (roll < 0.35 && opts.geo) return { t:"mp", s:s };
  // trivia: pick an unseen question of a suitable tier from a random category
  var cat = pick(r, TRIVIA), list = BANK[cat], tierOk = DIFFS[diff].tiers;
  var cands = [], i;
  for (i = 0; i < list.length; i++) if (tierOk.indexOf(list[i][0]) >= 0 && !(seen && seen["tv:" + cat + ":" + i])) cands.push(i);
  if (!cands.length) for (i = 0; i < list.length; i++) if (!(seen && seen["tv:" + cat + ":" + i])) cands.push(i);
  if (!cands.length){ if (seen) Object.keys(seen).forEach(function(k){ if (k.indexOf("tv:" + cat + ":") === 0) delete seen[k]; }); for (i = 0; i < list.length; i++) cands.push(i); }
  return { t:"tv", f:cat, i:pick(r, cands), s:s };
}
function freshIndex(r, n, keyOf, seen){
  var c = []; for (var i = 0; i < n; i++) if (!(seen && seen[keyOf(i)])) c.push(i);
  if (!c.length){ if (seen) for (var j = 0; j < n; j++) delete seen[keyOf(j)]; for (var k = 0; k < n; k++) c.push(k); }
  return pick(r, c);
}
function specKey(sp){ return sp.t === "tv" ? "tv:" + sp.f + ":" + sp.i : sp.t === "ch" ? "ch:" + sp.i : null; }
function buildQ(sp, gidx){
  var r = rng32(sp.s), q;
  if (sp.t === "tv"){
    var x = BANK[sp.f][sp.i];
    q = { kind:"text", cat:sp.f, tier:x[0], q:x[1], a:x[2], w:[x[3], x[4], x[5]], fact:x[6], alt:x[7] };
    q.typed = q.alt !== undefined && r() < 0.4;
  } else if (sp.t === "ma"){ q = mathQ(r, sp.tier); q.typed = r() < 0.5; }
  else if (sp.t === "ch"){
    var p = PUZZLES[sp.i], side = p[0].split(" ")[1] === "w" ? "White" : "Black";
    var bare = function(m){ return m.replace(/[+#]/g, ""); };   // never show check or mate symbols in the options
    q = { kind:"chess", cat:"chess", fen:p[0], side:side, q:side + " to move. Find checkmate in one.", a:bare(p[1]), w:p[2].map(bare), fact:bare(p[1]) + " is checkmate.", typed:false };
  } else if (sp.t === "gr"){ q = gridQ(r, sp.tier); if (!q) return buildQ({ t:"ma", s:sp.s, tier:1 }); }
  else if (sp.t === "mp"){ q = gidx ? mapQ(r, gidx) : null; if (!q) return buildQ({ t:"ma", s:sp.s, tier:2 }); }
  if (q.w) q.opts = shuffleR([q.a].concat(q.w), r);
  q.limit = (q.kind === "chess" || q.kind === "grid") ? 35000 : 25000;
  return q;
}
function checkAnswer(q, v){
  if (v === null || v === undefined || v === "") return false;
  if (q.kind === "map") return v === true;
  if (q.kind === "grid") return typedMatches(v, q.a, "", true);
  if (q.typed) return typedMatches(v, q.a, q.alt);
  return q.opts[v] === q.a;
}

/* ---------- rating ---------- */
function toDisp(R){ return Math.min(99.9, Math.max(0, 100 / (1 + Math.exp(-(R - 1500) / 250)))); }
function fromDisp(D){ return 1500 + 250 * Math.log(D / (100 - D)); }
function fmt(D){ return (Math.round(D * 10) / 10).toFixed(1); }
function expectScore(Ra, Rb){ return 1 / (1 + Math.pow(10, (Rb - Ra) / 400)); }
function rankOf(D){
  if (D < 20) return "Cadet"; if (D < 40) return "Ensign"; if (D < 55) return "Pilot";
  if (D < 70) return "Captain"; if (D < 80) return "Commander"; if (D < 90) return "Admiral";
  if (D < 96) return "Grand Admiral"; return "Meridian";
}
function ratingChange(R, botR, s, diff, games){ var K = games < 10 ? 48 : 28, d = K * (s - expectScore(R, botR)), D = DIFFS[diff]; return d > 0 ? d * D.up : d * D.down; }

/* ---------- race rules ---------- */
// Both sides answer the same question. The first correct answer pulls the planet one step. A wrong answer locks you out of that question.
var TRACK = 5, MAXQ = 15;

/* ---------- bots ---------- */
var BOTS = [
  { id:"cadet",     name:"Cadet Unit",     disp:20, know:.42, speed:12, desc:"Slow and shaky. A gentle start." },
  { id:"pilot",     name:"Pilot Vesk",     disp:40, know:.52, speed:10, desc:"Knows a fair bit. Takes its time." },
  { id:"captain",   name:"Captain Orrin",  disp:60, know:.62, speed:8,  desc:"Solid all-rounder, decent pace." },
  { id:"commander", name:"Commander Hale", disp:75, know:.72, speed:6.5,desc:"Quick and sharp across the board." },
  { id:"admiral",   name:"Admiral Sorne",  disp:88, know:.82, speed:5,  desc:"Elite. Fast, and rarely wrong." }
].map(function(b){ b.R = fromDisp(b.disp); return b; });
var KIND_SLOW = { text:1, chess:1.9, grid:2.2, map:1.3 }, KIND_HARD = { text:0, chess:-.08, grid:-.04, map:-.05 };
function botPlan(bot, q, r, km){
  var p = Math.max(.08, Math.min(.96, bot.know + (km || 0) + (KIND_HARD[q.kind] || 0) - ((q.tier || 2) - 2) * .07 - (q.typed ? .04 : 0)));
  var knows = r() < p, ok = knows || (q.kind === "text" && !q.typed && r() < 0.25);
  var t = bot.speed * (KIND_SLOW[q.kind] || 1) * (0.55 + r() * 0.9) * (knows ? 1 : 1.25) * 1000;
  return { ok:ok, t:Math.round(t) };
}

/* ---------- daily ---------- */
function dayKey(d){ d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function dailyNumber(key){ var p = key.split("-").map(Number); return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(2026, 10, 1)) / 864e5) + 1; }

/* ---------- drinking game wildcards ---------- */
var WILDCARDS = [
  { id:"quick",  title:"Quickfire", text:"Everyone answers out loud. First to shout the right answer hands out 2 sips. Anyone who shouts a wrong answer takes 1." },
  { id:"cheers", title:"Cheers", text:"Everyone takes a sip." },
  { id:"hot",    title:"Hot seat", text:"The leader gets a question. Right: they hand out 3 sips. Wrong: they take 3." },
  { id:"water",  title:"Water break", text:"Everyone has a sip of water. Doctor's orders." },
  { id:"rule",   title:"Make a rule", text:"The player in last place makes up a rule. It lasts until the next wildcard." },
  { id:"under",  title:"Underdog", text:"The player in last place gets a bonus point." }
];

if (typeof module !== "undefined") module.exports = { CATS:CATS, TRIVIA:TRIVIA, DIFFS:DIFFS, rng32:rng32, mathQ:mathQ, gridQ:gridQ, gridFind:gridFind, THEMES:THEMES,
  REGIONS:REGIONS, geoIndex:geoIndex, mapQ:mapQ, makeProj:makeProj, mapHit:mapHit, inFeature:inFeature, typedMatches:typedMatches, chooseSpec:chooseSpec, buildQ:buildQ,
  checkAnswer:checkAnswer, specKey:specKey, toDisp:toDisp, fromDisp:fromDisp, ratingChange:ratingChange, expectScore:expectScore, BOTS:BOTS, botPlan:botPlan,
  TRACK:TRACK, MAXQ:MAXQ, dayKey:dayKey, dailyNumber:dailyNumber, hashStr:hashStr, WILDCARDS:WILDCARDS, recommendedDiff:recommendedDiff };
