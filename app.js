"use strict";
/* Meridian v0.5 interface: one planet, first right answer pulls it. Solo vs bots, daily, live with a friend, drinking game. */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const C = $("console");
delete CATS.chess;
const scr = html => { C.innerHTML = html; };
const mfd = (inner, cls) => `<div class="bezel"><div class="mfd ${cls || ""}">${inner}</div></div>`;
const sips = n => n + " sip" + (n === 1 ? "" : "s");

/* ================= PROFILE ================= */
const KEY = "meridian-profile-v5";
function freshProfile(){ return { R: fromDisp(30), games:0, wins:0, hist:[30], cats:{}, diff:null, seenTut:false, sound:true, daily:{}, party:null, seen:{}, name:"" }; }
function load(){ try { const p = JSON.parse(localStorage.getItem(KEY)); if (p && typeof p.R === "number"){ p.cats = p.cats || {}; p.seen = p.seen || {}; p.daily = p.daily || {}; return p; } } catch(e){} return freshProfile(); }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(P)); } catch(e){} }
let P = load();
function markSeen(spec){ const k = specKey(spec); if (k){ P.seen[k] = 1; const ks = Object.keys(P.seen); if (ks.length > 1500) ks.slice(0, 300).forEach(x => delete P.seen[x]); } }
function tally(cat, ok){ const c = P.cats[cat] || (P.cats[cat] = { c:0, t:0 }); c.t++; if (ok) c.c++; }

/* ================= MAP DATA (loaded from a public package; map questions only appear once it's here) ================= */
let GIDX = null;
(function(){
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@amcharts/amcharts4-geodata@4.1.31/dist/script/worldLow.js";
  s.async = true;
  s.onload = () => { try { const fc = window.am4geodata_worldLow; const idx = geoIndex(fc); if (Object.keys(idx).length > 100) GIDX = idx; } catch(e){} if (MP) mpPresence(); };
  document.head.appendChild(s);
})();

/* ================= SOUND ================= */
const SND = {
  ctx:null,
  init(){ if (!this.ctx){ try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ this.ctx = null; } } if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {}); },
  tone(f, d, type, vol, slide, delay){
    if (!P.sound || !this.ctx) return;
    try { const c = this.ctx, t0 = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || .12, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + d + .05); } catch(e){}
  },
  noise(d, vol, f0, f1){
    if (!P.sound || !this.ctx) return;
    try { const c = this.ctx, n = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, n, c.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; bp.type = "bandpass"; bp.Q.value = 1.2; bp.frequency.setValueAtTime(f0, c.currentTime); bp.frequency.exponentialRampToValueAtTime(f1, c.currentTime + d);
      g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d);
      s.connect(bp).connect(g).connect(c.destination); s.start(); } catch(e){}
  },
  right(){ this.tone(880, .1, "triangle", .1); this.tone(1320, .14, "triangle", .1, 0, .07); },
  wrong(){ this.tone(170, .28, "sawtooth", .06, 120); },
  tick(){ this.tone(1200, .03, "square", .03); },
  pull(good){ this.noise(.7, .1, good ? 300 : 1800, good ? 1800 : 300); },
  win(){ [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .3, "triangle", .1, 0, i * .11)); },
  lose(){ this.tone(330, .6, "sine", .1, 140); },
  card(){ [700, 900, 1200].forEach((f, i) => this.tone(f, .12, "triangle", .08, 0, i * .06)); }
};
document.addEventListener("pointerdown", () => SND.init());
document.addEventListener("keydown", () => SND.init());
function paintSnd(){ $("sndBtn").textContent = P.sound ? "SND ON" : "SND OFF"; $("sndBtn").setAttribute("aria-pressed", String(P.sound)); }
$("sndBtn").onclick = () => { P.sound = !P.sound; save(); paintSnd(); };
paintSnd();

/* ================= COCKPIT ================= */
const TUG = { on:false, pos:0, shown:0, col:"#ffb43d", beamY:0, beamF:0, pulse:0, left:"You", right:"" };
function readout(t){ $("readout").textContent = t; }
function placard(step, title, text){ $("placard").innerHTML = `${step ? `<span class="stp">${esc(step)}</span>` : ""}<div class="ttl">${esc(title)}</div><div class="txt">${esc(text)}</div>`; }
function overlay(html){ $("planets").innerHTML = html || ""; }
function idleCanopy(){ TUG.on = false; overlay(`<span class="cat" style="top:42%;font-size:22px;color:var(--amber)">MERIDIAN</span>`); }
function tugView(label, col, leftName, rightName){
  TUG.on = true; TUG.col = col || "#ffb43d";
  overlay(`<span class="cat" style="color:${col || "var(--amber)"}">${esc(label || "")}</span><span class="side l">${esc(leftName || "You")}</span><span class="side r">${esc(rightName || "")}</span>`);
}
function pullFx(dir){ TUG.pulse = 1; if (dir > 0) TUG.beamY = 1; else if (dir < 0) TUG.beamF = 1; SND.pull(dir >= 0); }

/* ================= HELP & TUTORIAL ================= */
const HELP = [
  ["How to win", ["One planet sits between you and your opponent. You both get the same question.", "The first person to answer correctly pulls the planet one step their way.", "A wrong answer locks you out of that question, so don't guess too fast.", "Pull the planet 5 steps to your side to win. After 15 questions, whoever has it on their side wins."]],
  ["Question types", ["Trivia: science, geography, space, computing, history, music, film and literature. Pick an option or type the answer. Small typos are fine.", "Maths: quick sums. Word grid: spot the hidden word and type it. Map: tap the country."]],
  ["Ways to play", ["Solo against bots, for your rating.", "Daily Sortie: the same match for everyone today.", "Live: play a friend on their own phone with a room code.", "Drinking game: one phone passed round. Right scores a point, wrong means sips."]],
  ["Rating", ["Your rating runs 0–100 and never quite reaches it. Hard earns more for a win, Easy less.", "You won't see the same question again for a long while: the game remembers what you've had."]]
];
function openHelp(){
  showModal(`<div class="row between"><h2 id="mtitle">How to play</h2><button class="flat" id="mclose">Close</button></div>
    ${HELP.map(([h, l]) => `<div class="hsec"><h3>${esc(h)}</h3><ul>${l.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")}
    <button class="go" id="mtut">Step-by-step tutorial</button>`);
  $("mclose").onclick = closeModal; $("mtut").onclick = () => openTutorial(0);
}
const TUT = [
  ["Race to answer", "You and your opponent get the same question. First to answer correctly pulls the planet one step your way.", `<div class="mini" style="color:#55c6ff">YOU</div><div class="mini" style="color:#ffb43d">● planet</div><div class="mini" style="color:#ff4f5e">THEM</div>`],
  ["Careful with guesses", "A wrong answer locks you out of that question. Your opponent can still take it.", `<div class="mini">Right first<br><b style="color:#69e39a">pull</b></div><div class="mini">Wrong<br><b style="color:#ff6670">locked out</b></div>`],
  ["Not just trivia", "Word grids, maps and maths are mixed in with trivia.", `<div class="mini">A B C<br>word grid</div><div class="mini">🗺 tap it</div><div class="mini">12 × 7</div>`],
  ["Win", "Pull the planet 5 steps to your side. Play bots, the Daily Sortie, a friend live, or the drinking game.", `<div class="mini" style="color:#ffb43d">5 steps</div>`]
];
function openTutorial(i){
  const t = TUT[i];
  showModal(`<div class="row between"><span class="eyebrow">Tutorial ${i + 1} of ${TUT.length}</span><button class="flat" id="mclose">Skip</button></div>
    <h2 id="mtitle">${esc(t[0])}</h2><p>${esc(t[1])}</p><div class="tutfig">${t[2]}</div>
    <div class="dots">${TUT.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div>
    <div class="row"><button class="flat" id="tprev" ${i === 0 ? "disabled" : ""}>Back</button><button class="go" id="tnext" style="flex:1">${i === TUT.length - 1 ? "Start playing" : "Next"}</button></div>`);
  const done = () => { P.seenTut = true; save(); closeModal(); };
  $("mclose").onclick = done; $("tprev").onclick = () => openTutorial(i - 1);
  $("tnext").onclick = () => i === TUT.length - 1 ? done() : openTutorial(i + 1);
}
let modalReturn = null;
function showModal(html){ const m = $("modal"); if (m.hidden) modalReturn = document.activeElement; $("mbody").innerHTML = html; m.hidden = false; const b = m.querySelector("button"); if (b) b.focus(); }
function closeModal(){ $("modal").hidden = true; if (modalReturn && modalReturn.focus) modalReturn.focus(); }
$("helpBtn").onclick = openHelp;
$("modal").onclick = e => { if (e.target.id === "modal") closeModal(); };
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("modal").hidden) closeModal(); });
function copy(text, btn){ const done = ok => { if (btn){ const o = btn.textContent; btn.textContent = ok ? "Copied" : "Couldn't copy"; setTimeout(() => { btn.textContent = o; }, 1600); } }; try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); } catch(e){ done(false); } }

/* ================= QUESTION RENDERING (shared by every mode) ================= */
const PIECE = { K:"♚", Q:"♛", R:"♜", B:"♝", N:"♞", P:"♟" };
function boardHTML(fen, flip){
  const rows = fen.split(" ")[0].split("/"), sq = [];
  rows.forEach(row => { const r = []; for (const ch of row){ if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) r.push(""); else r.push(ch); } sq.push(r); });
  let out = "";
  for (let vr = 0; vr < 8; vr++) for (let vf = 0; vf < 8; vf++){
    const r = flip ? 7 - vr : vr, f = flip ? 7 - vf : vf, p = sq[r][f], light = (r + f) % 2 === 0;
    const coF = vr === 7 ? `<span class="co f">${"abcdefgh"[f]}</span>` : "", coR = vf === 0 ? `<span class="co r">${8 - r}</span>` : "";
    out += `<div class="${light ? "l" : "d"}">${p ? `<span class="${p === p.toUpperCase() ? "w" : "b"}">${PIECE[p.toUpperCase()]}</span>` : ""}${coF}${coR}</div>`;
  }
  return `<div class="board8" role="img" aria-label="Chess position">${out}</div>`;
}
function catOf(q){ return CATS[q.cat] || { name:"Question", col:"#ffb43d" }; }
// Renders q into #qa. onAnswer(value) is called once. Returns {reveal(ok)}.
let qHandler = null;
function renderQuestion(q, kindLine, onAnswer){
  const cat = catOf(q);
  let body = "";
  if (q.kind === "chess") body = boardHTML(q.fen, q.side === "Black");
  if (q.kind === "grid") body = `<div class="wgrid" style="grid-template-columns:repeat(${q.n},1fr)">${q.grid.split("").map((c, i) => `<span data-c="${i}">${c}</span>`).join("")}</div>`;
  if (q.kind === "map") body = `<div class="mapbox"><canvas id="mapc" width="720" height="460" aria-label="Map of ${esc(REGIONS[q.region].name)}"></canvas></div>`;
  const typed = q.kind === "grid" || q.typed;
  const answerUI = q.kind === "map" ? `<p class="small mute">Tap the country on the map.</p>`
    : typed ? `<form class="typed" id="tf" autocomplete="off"><input id="tin" maxlength="60" aria-label="Your answer" placeholder="Type your answer" autocapitalize="${q.kind === "grid" ? "characters" : "off"}" spellcheck="false"><button class="go">Fire</button></form>`
    : `<div class="opts" id="opts">${q.opts.map((o, i) => `<button data-i="${i}"><span class="k">${i + 1}</span>${esc(o)}</button>`).join("")}</div>`;
  $("qa").innerHTML = mfd(`<div class="row between wrap"><span class="qtag" style="--c:${cat.col}">${esc(cat.name)}</span><span class="qkind">${esc(kindLine)}</span></div>
    <div class="qtext">${esc(q.q)}</div>${body}${answerUI}<span class="status" id="qstat" aria-live="polite"></span>`, "q");
  let locked = false, tap = null, proj = null;
  qHandler = v => { if (locked) return; locked = true; qHandler = null; onAnswer(v); };
  if (q.kind === "map") proj = drawMap(q, null, null, px => { tap = px; const hit = mapHit(px, GIDX[q.target], proj, 10); drawMap(q, px, null); qHandler && qHandler(hit); });
  else if (typed){
    $("tf").onsubmit = e => { e.preventDefault(); const v = $("tin").value.trim(); if (v && qHandler) qHandler(v); };
    setTimeout(() => { const i = $("tin"); if (i && !("ontouchstart" in window && q.kind === "grid")) i.focus(); }, 30);
  } else $("opts").onclick = e => { const b = e.target.closest("button"); if (b && qHandler) qHandler(Number(b.dataset.i)); };
  return {
    lockUI(){ locked = true; qHandler = null; const i = $("tin"); if (i) i.disabled = true; C.querySelectorAll("#opts button").forEach(b => b.disabled = true); },
    mark(v, ok){
      if (q.kind === "text" && !q.typed || q.kind === "chess"){ C.querySelectorAll("#opts button").forEach((b, j) => { b.disabled = true; if (q.opts[j] === q.a) b.classList.add("right"); else if (j === v) b.classList.add("wrong"); }); }
      const i = $("tin"); if (i) i.disabled = true;
    },
    reveal(){
      this.mark(null);
      if (q.kind === "grid") q.cells.forEach(c => { const el = C.querySelector(`.wgrid span[data-c="${c}"]`); if (el) el.classList.add("hit"); });
      if (q.kind === "map") drawMap(q, tap, true);
    }
  };
}
function drawMap(q, tap, showTarget, onTap){
  const cv = $("mapc"); if (!cv || !GIDX) return null;
  const R = REGIONS[q.region], W = cv.width, H = cv.height, x = cv.getContext("2d"), proj = makeProj(R.box, W, H);
  x.fillStyle = "#0b1a26"; x.fillRect(0, 0, W, H);
  const draw = (f, fill, stroke, lw) => {
    const g = f.geometry; if (!g) return;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    x.beginPath();
    polys.forEach(poly => poly.forEach(ring => ring.forEach((pt, i) => { const p = proj.fwd(pt[0], pt[1]); i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); })));
    x.fillStyle = fill; x.fill("evenodd"); x.strokeStyle = stroke; x.lineWidth = lw; x.stroke();
  };
  Object.values(GIDX).forEach(f => draw(f, "#2a3a2f", "#0b1a26", 1.2));
  if (showTarget) draw(GIDX[q.target], "#3fbf7a", "#d6ffe6", 2);
  if (tap){ x.fillStyle = "#ffb43d"; x.strokeStyle = "#000"; x.lineWidth = 2; x.beginPath(); x.arc(tap[0], tap[1], 8, 0, 6.283); x.fill(); x.stroke(); }
  if (onTap) cv.onclick = e => { const r = cv.getBoundingClientRect(); onTap([(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]); };
  else cv.onclick = null;
  return proj;
}
document.addEventListener("keydown", e => {
  if (!$("modal").hidden || (e.target && e.target.tagName === "INPUT")) return;
  if (qHandler && ["1","2","3","4"].includes(e.key) && $("opts")) qHandler(Number(e.key) - 1);
});

/* ================= TIMER ================= */
let timerId = null;
function startTimer(end, total, onDone){
  stopTimer(); let lastS = -1;
  const tick = () => {
    const left = Math.max(0, end - Date.now()), t = $("t"), tb = $("tb"), s = Math.ceil(left / 1000);
    if (t){ t.textContent = s; t.classList.toggle("low", left < 5000); }
    if (tb) tb.style.transform = `scaleX(${(left / total).toFixed(3)})`;
    if (s !== lastS && s <= 3 && s > 0) SND.tick();
    lastS = s;
    if (left <= 0){ stopTimer(); onDone && onDone(); }
  };
  tick(); timerId = setInterval(tick, 100);
}
function stopTimer(){ if (timerId){ clearInterval(timerId); timerId = null; } }
const timerBar = () => `<div class="row between"><span class="eyebrow">Time left</span><span class="timer" id="t"></span></div><div class="tbar"><i id="tb"></i></div>`;

/* ================= HOME ================= */
const DAILY_BOT = 2, DAILY_DIFF = "standard";
function home(){
  stopTimer(); clearBot(); M = null; PT = null; qHandler = null;
  if (MP) mpLeave(true);
  idleCanopy(); readout("HANGAR · READY");
  placard("", "Hangar", "First right answer pulls the planet. Get it 5 steps to your side to win.");
  const D = toDisp(P.R), recD = recommendedDiff(D);
  if (!P.diff) P.diff = recD;
  const today = dayKey(), dn = dailyNumber(today), done = P.daily[today];
  const hist = P.hist.slice(-20), lo = Math.min(...hist) - 2, hi = Math.max(...hist) + 2;
  const line = hist.map((v, i) => `${(i / Math.max(1, hist.length - 1) * 200).toFixed(1)},${(40 - (v - lo) / (hi - lo || 1) * 36 - 2).toFixed(1)}`).join(" ");
  const acc = k => P.cats[k] && P.cats[k].t ? Math.round(P.cats[k].c / P.cats[k].t * 100) : null;
  scr(
    mfd(`<div class="hero"><div class="row between wrap"><h2>Daily Sortie <span class="num">#${dn}</span></h2><span class="small mute">Same match for everyone today</span></div>
      ${done ? `<p>You ${done.pos > 0 ? "won" : done.pos < 0 ? "lost" : "drew"}. New sortie tomorrow.</p><div class="grid">${esc(done.grid)}</div><button class="go" id="shareDaily">Copy result to share</button>`
      : `<p>vs ${esc(BOTS[DAILY_BOT].name)} · Standard. One attempt.</p><button class="go big" id="playDaily">Play today's sortie</button>`}</div>`) +
    mfd(`<h2>Play a friend live</h2>
      <p class="small mute">Each on your own phone. One of you starts a game and shares the 4-letter code.</p>
      <input class="namein" id="mpName" maxlength="14" placeholder="Your name" value="${esc(P.name)}" aria-label="Your name">
      <button class="go big" id="mpCreate">Start a game</button>
      <form class="cinput" id="mpJoin" autocomplete="off"><input id="mpCode" maxlength="4" placeholder="CODE" aria-label="Game code"><button class="go">Join</button></form>
      <p class="small" id="mpErr" style="color:var(--bad)"></p>`) +
    mfd(`<h2>Solo vs bots</h2>
      <div class="seg" id="diffSeg">${Object.entries(DIFFS).map(([k, d]) => `<button data-v="${k}" aria-pressed="${P.diff === k}">${d.name}${k === recD ? ' <span class="chip">For you</span>' : ""}<small>${k === "easy" ? "Wins ×0.75" : k === "standard" ? "Normal" : "Wins ×1.25"}</small></button>`).join("")}</div>
      <ul class="opps">${BOTS.map((b, i) => `<li><span class="nm">${esc(b.name)}</span><span class="ds">${esc(b.desc)}</span>
        <span class="rt"><b>${fmt(b.disp)}</b><span>${Math.round(expectScore(P.R, b.R) * 100)}% for you</span></span><button class="go" data-bot="${i}">Engage</button></li>`).join("")}</ul>`) +
    mfd(`<div class="partycard"><h2 style="color:#ff8fc7">Drinking game</h2><p>2–8 players, one phone passed around. Right scores a point, wrong means sips.</p>
      <button class="go big" id="party" style="background:linear-gradient(#ffa6d3,#e9679f);border-color:#6b1f43;color:#2a0716">Start the drinking game</button></div>`) +
    mfd(`<h2>Service record</h2>
      <div class="row wrap" style="align-items:baseline;gap:14px"><span class="big-r">${fmt(D)}</span><div><div class="rank">${rankOf(D)}</div><span class="small mute">${P.games} matches · ${P.wins} wins</span></div></div>
      ${hist.length > 1 ? `<svg viewBox="0 0 200 40" width="100%" height="44" preserveAspectRatio="none" aria-label="Rating over your last ${hist.length} matches"><polyline points="${line}" fill="none" stroke="#ffb43d" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>` : ""}
      <div class="bars">${Object.keys(CATS).map(k => { const a = acc(k); return `<div class="bar"><span style="color:${CATS[k].col}">${CATS[k].name}</span><span class="tr"><i style="width:${a ?? 0}%;background:${CATS[k].col}"></i></span><span class="mono">${a === null ? "–" : a + "%"}</span></div>`; }).join("")}</div>`) +
    `<div class="row"><button class="flat" id="tut" style="flex:1">Tutorial</button><button class="flat" id="reset" style="flex:1">${resetArmed ? "Tap again to wipe everything" : "Reset profile"}</button></div>`);
  if (done) $("shareDaily").onclick = e => copy(dailyShare(dn, done), e.currentTarget);
  else $("playDaily").onclick = () => startSolo({ kind:"daily", seed:hashStr("meridian-race-" + today), botIdx:DAILY_BOT, diff:DAILY_DIFF, day:today });
  $("diffSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; P.diff = b.dataset.v; save(); home(); };
  C.querySelectorAll("[data-bot]").forEach(b => b.onclick = () => startSolo({ kind:"quick", seed:newSeed(), botIdx:Number(b.dataset.bot), diff:P.diff }));
  $("party").onclick = partyGate;
  const nameOk = () => { const n = $("mpName").value.trim().slice(0, 14); if (!n){ $("mpErr").textContent = "Type your name first."; $("mpName").focus(); return null; } P.name = n; save(); return n; };
  $("mpCreate").onclick = () => { if (!nameOk()) return; const L = "ABCDEFGHJKLMNPQRSTUVWXYZ"; let c = ""; for (let i = 0; i < 4; i++) c += L[Math.floor(Math.random() * L.length)]; mpEnter(c, true); };
  $("mpJoin").onsubmit = e => { e.preventDefault(); if (!nameOk()) return; const c = $("mpCode").value.trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(c)){ $("mpErr").textContent = "Codes are four letters."; return; } mpEnter(c, false); };
  $("tut").onclick = () => openTutorial(0);
  $("reset").onclick = () => { if (resetArmed){ P = freshProfile(); save(); resetArmed = false; paintSnd(); } else { resetArmed = true; setTimeout(() => { resetArmed = false; }, 4000); } home(); };
  window.scrollTo(0, 0);
  if (!P.seenTut) openTutorial(0);
}
let resetArmed = false;
function dailyShare(dn, d){ return `MERIDIAN Daily #${dn}\n${d.pos > 0 ? "Won" : d.pos < 0 ? "Lost" : "Drew"} · ${d.acc}% right\n${d.grid}`; }

/* ================= SOLO vs BOT ================= */
let M = null, botTimer = null;
function clearBot(){ if (botTimer){ clearTimeout(botTimer); botTimer = null; } }
function startSolo(o){
  const bot = BOTS[o.botIdx];
  M = { kind:o.kind, day:o.day, diff:o.diff, bot, botIdx:o.botIdx, r:rng32(o.seed), br:rng32((o.seed ^ 0x5bd1e995) | 0), pos:0, n:0, log:[], grid:[] };
  TUG.pos = 0; TUG.shown = 0;
  soloQuestion();
}
function soloReadout(){ readout(`${M.kind === "daily" ? "DAILY · " : ""}Q${M.n + 1}/${MAXQ} · ${M.pos > 0 ? "YOUR SIDE +" + M.pos : M.pos < 0 ? "THEIR SIDE " + -M.pos : "CENTRE"}`); }
function soloQuestion(){
  stopTimer(); clearBot();
  const spec = chooseSpec(M.r, M.diff, M.kind === "daily" ? null : P.seen, { geo: M.kind !== "daily" && !!GIDX });
  const q = buildQ(spec, GIDX);
  if (M.kind !== "daily") markSeen(spec);
  const cat = catOf(q);
  M.q = q; M.state = { open:true, me:null, bot:null };
  TUG.pos = M.pos; tugView(cat.name, cat.col, "You", M.bot.name);
  soloReadout();
  placard(`QUESTION ${M.n + 1}`, "First right answer pulls", "A wrong answer locks you out of this one.");
  scr(timerBar() + `<div id="qa"></div><p class="status foe" id="bstat">${esc(M.bot.name)} is thinking…</p><button class="flat" id="quit">Forfeit (counts as a loss)</button>`);
  const ui = M.ui = renderQuestion(q, q.kind === "map" ? "Tap it" : q.typed || q.kind === "grid" ? "Type it" : "Pick one", v => soloAnswer(v));
  $("quit").onclick = () => { M.forfeited = true; soloFinish(); };
  const plan = botPlan(M.bot, q, M.br, DIFFS[M.diff].know);
  if (plan.t < q.limit) botTimer = setTimeout(() => soloBot(plan.ok), plan.t);
  startTimer(Date.now() + q.limit, q.limit, () => soloEnd(null));
  window.scrollTo(0, 0);
}
function soloAnswer(v){
  if (!M || !M.state.open) return;
  const ok = checkAnswer(M.q, v);
  M.state.me = { ok, v };
  M.ui.mark(v, ok); ok ? SND.right() : SND.wrong();
  if (ok) return soloEnd("you");
  $("qstat").textContent = "Wrong. You're locked out of this one."; $("qstat").className = "status foe";
  if (M.state.bot) soloEnd(null);
}
function soloBot(ok){
  botTimer = null;
  if (!M || !M.state.open) return;
  M.state.bot = { ok };
  if (ok) return soloEnd("bot");
  $("bstat").textContent = `${M.bot.name} answered wrong.`;
  if (M.state.me) soloEnd(null);
}
function soloEnd(w){
  if (!M || !M.state.open) return;
  M.state.open = false; stopTimer(); clearBot(); M.ui.lockUI();
  const q = M.q, me = M.state.me;
  const myOk = !!(me && me.ok);
  tally(q.cat, myOk);
  M.log.push({ q, ok:myOk, v: me ? me.v : null });
  const d = w === "you" ? 1 : w === "bot" ? -1 : 0;
  M.pos = Math.max(-TRACK, Math.min(TRACK, M.pos + d)); M.n++;
  M.grid.push(d > 0 ? "🟦" : d < 0 ? "🟥" : "⬛");
  TUG.pos = M.pos; pullFx(d);
  M.ui.reveal();
  const over = Math.abs(M.pos) >= TRACK || M.n >= MAXQ;
  placard(`QUESTION ${M.n}`, w === "you" ? "You pulled it!" : w === "bot" ? `${M.bot.name} pulled it` : "Nobody got it", over ? "That's the match." : "Next question coming up.");
  soloReadout();
  $("bstat").textContent = w === "bot" ? `${M.bot.name} answered first.` : M.state.bot ? $("bstat").textContent : w === "you" ? `You beat ${M.bot.name} to it.` : "Time's up.";
  $("bstat").className = "status " + (w === "you" ? "you" : "foe");
  $("qstat").innerHTML = `<span class="mute">Answer:</span> <b style="color:var(--ink)">${esc(q.a)}</b>${q.fact ? `<br><span class="small mute">${esc(q.fact)}</span>` : ""}`; $("qstat").className = "status";
  const q2 = $("quit"); q2.outerHTML = `<button class="go big" id="nx">${over ? "See the result" : "Next question"}</button>`;
  $("nx").onclick = () => over ? soloFinish() : soloQuestion();
  $("nx").focus({ preventScroll:true });
  save();
}
function soloFinish(){
  stopTimer(); clearBot(); qHandler = null;
  const before = toDisp(P.R), pos = M.forfeited ? -TRACK : M.pos, s = pos > 0 ? 1 : pos < 0 ? 0 : 0.5;
  const verdict = M.forfeited ? "Forfeit" : s === 1 ? "Victory" : s === 0 ? "Defeat" : "Draw";
  s === 1 ? SND.win() : s === 0 ? SND.lose() : null;
  P.R += ratingChange(P.R, M.bot.R, s, M.diff, P.games); P.games++; if (s === 1) P.wins++;
  const after = toDisp(P.R); P.hist.push(Math.round(after * 10) / 10); if (P.hist.length > 60) P.hist = P.hist.slice(-60);
  const right = M.log.filter(x => x.ok).length, acc = M.log.length ? Math.round(right / M.log.length * 100) : 0, grid = M.grid.join("") || "⬛";
  if (M.kind === "daily"){ P.daily[M.day] = { pos, grid, acc }; const ks = Object.keys(P.daily).sort(); while (ks.length > 30) delete P.daily[ks.shift()]; }
  save();
  const d = Math.round((after - before) * 10) / 10, missed = M.log.filter(x => !x.ok);
  const kind = M.kind, bot = M.bot, botIdx = M.botIdx, diff = M.diff, day = M.day;
  TUG.pos = pos;
  readout("DEBRIEF · " + verdict.toUpperCase());
  placard("", "Debrief", missed.length ? "Here's what you missed." : "Clean sweep.");
  const share = kind === "daily" ? dailyShare(dailyNumber(day), P.daily[day]) : `MERIDIAN: ${verdict} vs ${bot.name}\n${grid}`;
  scr(mfd(`<span class="eyebrow">${kind === "daily" ? "Daily Sortie #" + dailyNumber(day) + " · " : ""}vs ${esc(bot.name)} · ${DIFFS[diff].name}</span>
      <p class="verdict" style="color:${s === 1 ? "var(--you)" : s === 0 ? "var(--foe)" : "var(--ink)"}">${verdict}</p>
      <p style="text-align:center">${right} of ${M.log.length} right · ${acc}%</p><div class="grid" style="text-align:center">${grid}</div>`) +
    mfd(`<span class="eyebrow">Rating</span><div class="row wrap" style="align-items:baseline;gap:14px"><span class="big-r">${fmt(after)}</span><span class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "+" : ""}${d.toFixed(1)}</span><span class="mute">from ${fmt(before)} · ${rankOf(after)}</span></div>`) +
    mfd(`<h2>Share</h2><pre class="code" style="white-space:pre-wrap;text-align:left;font-size:16px;margin:0">${esc(share)}</pre><button class="go" id="cpy">Copy</button>`) +
    (missed.length ? mfd(`<h2>To learn · ${missed.length}</h2><ul class="debrief">${missed.map(x => `<li style="--c:${catOf(x.q).col}"><span class="q">${esc(x.q.kind === "map" ? "Map: " + x.q.q : x.q.q)}</span><span class="a">Answer: <b>${esc(x.q.a)}</b></span>${x.q.fact ? `<span class="fct">${esc(x.q.fact)}</span>` : ""}</li>`).join("")}</ul>`) : "") +
    `<div class="row">${kind === "daily" ? "" : `<button class="go big" id="re" style="flex:1">Rematch</button>`}<button class="flat" id="hm" ${kind === "daily" ? 'style="flex:1"' : ""}>Hangar</button></div>`);
  $("cpy").onclick = e => copy(share, e.currentTarget);
  const re = $("re"); if (re) re.onclick = () => startSolo({ kind:"quick", seed:newSeed(), botIdx, diff });
  $("hm").onclick = home;
  M = null; window.scrollTo(0, 0);
}

/* ================= LIVE MULTIPLAYER (room capability) ================= */
let ROOM = null, MP = null;
const roomReady = (async () => { try { ROOM = (window.claude && typeof claude.use === "function") ? await claude.use("room") : null; } catch(e){ ROOM = null; } return ROOM; })();
async function mpEnter(code, asHost){
  const err = t => { const e = $("mpErr"); if (e) e.textContent = t; };
  err("Connecting…");
  const room = await roomReady;
  if (!room){ err("Live games can't connect here. Open Meridian from its claude.ai link while signed in. Your friend needs it shared with them too."); return; }
  let R;
  try { R = await room.join("meridian-" + code.toLowerCase()); } catch(e){ err("Couldn't open that game. Try again."); return; }
  MP = { R, code, host:asHost, g:null, lastG:null, hadHost:false, my:null, myAns:null, shownKey:null, r:rng32(newSeed()), diff:P.diff || "standard", timer:null, ui:null };
  if (asHost) MP.g = { ph:"lobby", ep:0, i:0, pos:0, n:0, spec:null, res:null, diff:MP.diff };
  R.onPeers(() => mpSync(), () => {});
  mpPresence();
  if (asHost) mpPushG();
  mpSync();
  if (!asHost) setTimeout(() => { if (MP && !mpHostPeer()) mpSync(); }, 4000);
  MP.loop = setInterval(mpLoop, 200);
}
function mpPresence(extra){ if (MP) MP.R.presence(Object.assign({ nick:P.name || "Player", geo: GIDX ? 1 : 0 }, MP.myAns ? { a:MP.myAns } : {}, extra || {})).catch(() => {}); }
function mpPushG(){ MP.g.t = Date.now(); MP.R.presence({ host:1, g:MP.g }).catch(() => {}); mpSync(); }
function mpPeers(){ return MP ? MP.R.peers().filter(p => p.kind === "viewer" && p.presence && p.presence.nick) : []; }
function mpHostPeer(){ const hs = mpPeers().filter(p => p.presence.host && p.presence.g).sort((a, b) => a.peer < b.peer ? -1 : 1); return hs[0] || null; }
function mpOpp(){ // the other player: host's guest is the first non-host peer; guest's opponent is the host
  if (MP.host) return mpPeers().filter(p => !p.sameTab && !p.presence.host).sort((a, b) => a.peer < b.peer ? -1 : 1)[0] || null;
  return mpHostPeer();
}
function mpLeave(quiet){
  if (!MP) return; const m = MP; MP = null; clearInterval(m.loop); stopTimer();
  try { m.R.leave(); } catch(e){}
  if (!quiet) home();
}
function mpState(){ if (MP.host) return MP.g; const hp = mpHostPeer(); if (hp){ MP.hadHost = true; return hp.presence.g; } return MP.hadHost ? { ph:"gone" } : null; }
function mpSync(){
  if (!MP) return;
  const g = mpState(), opp = mpOpp(), oppName = opp ? opp.presence.nick : "Waiting…";
  if (!g){ idleCanopy(); readout("LIVE · " + MP.code); placard("LIVE", "Looking for game " + MP.code, "Waiting for the host."); if (MP.shownKey !== "wait"){ MP.shownKey = "wait"; scr(mfd(`<h2>Joining ${esc(MP.code)}…</h2><p class="mute" id="wmsg">If nothing happens, check the code with your friend.</p>`) + `<button class="flat" id="lv">Leave</button>`); $("lv").onclick = () => mpLeave(); } return; }
  if (g.ph === "gone"){ if (MP.shownKey !== "gone"){ MP.shownKey = "gone"; scr(mfd(`<h2>The host left, so the game has ended.</h2>`) + `<button class="go big" id="lv">Back to hangar</button>`); $("lv").onclick = () => mpLeave(); } return; }
  const meSign = MP.host ? 1 : -1;
  TUG.pos = (g.pos || 0) * meSign;
  const key = g.ph + ":" + g.ep + ":" + g.i;
  if (g.ph === "lobby"){
    tugView("Live game", "#ffb43d", P.name || "You", oppName);
    readout("LIVE · CODE " + MP.code);
    placard("LIVE", "Game " + MP.code, opp ? "Both players are here." : "Send your friend the code " + MP.code + ".");
    if (MP.shownKey !== key + (opp ? opp.peer : "")){
      MP.shownKey = key + (opp ? opp.peer : "");
      scr(mfd(`<span class="eyebrow">Game code</span><div class="code" style="font-size:40px">${esc(MP.code)}</div>
          <p class="small mute">Your friend opens Meridian on their phone, types their name and joins with this code. Meridian needs to be shared with them, and they need to be signed in to Claude.</p>
          <ul class="opps lobby"><li><span class="nm">${esc(P.name || "You")}</span><span class="ds">${MP.host ? "Host · you" : "You"}</span></li>
            <li><span class="nm">${opp ? esc(opp.presence.nick) : "Waiting for a friend…"}</span><span class="ds">${opp ? (MP.host ? "Guest" : "Host") : ""}</span></li></ul>
          ${MP.host ? `<div class="seg" id="mpDiff">${Object.entries(DIFFS).map(([k, d]) => `<button data-v="${k}" aria-pressed="${g.diff === k}">${d.name}</button>`).join("")}</div>` : `<p class="mute">Waiting for the host to start.</p>`}`) +
        (MP.host ? `<button class="go big" id="mpGo" ${opp ? "" : "disabled"}>Start the match</button>` : "") + `<button class="flat" id="lv">Leave</button>`);
      if (MP.host){ $("mpDiff").onclick = e => { const b = e.target.closest("button"); if (!b) return; MP.g.diff = b.dataset.v; MP.shownKey = null; mpPushG(); }; $("mpGo").onclick = mpStart; }
      $("lv").onclick = () => mpLeave();
    }
    return;
  }
  if (g.ph === "q"){
    if (MP.shownKey !== key){
      MP.shownKey = key; MP.myAns = null; mpPresence({ a:null });
      const q = MP.q = buildQ(g.spec, GIDX); markSeen(g.spec); save();
      const cat = catOf(q);
      tugView(cat.name, cat.col, P.name || "You", oppName);
      readout(`LIVE · Q${g.i + 1}/${MAXQ}`);
      placard(`QUESTION ${g.i + 1}`, "First right answer pulls", "A wrong answer locks you out of this one.");
      scr(timerBar() + `<div id="qa"></div><p class="status foe" id="bstat">${esc(oppName)} is thinking…</p><button class="flat" id="lv">Leave game</button>`);
      MP.shownAt = Date.now();
      MP.ui = renderQuestion(q, q.kind === "map" ? "Tap it" : q.typed || q.kind === "grid" ? "Type it" : "Pick one", v => {
        const ok = checkAnswer(q, v); MP.ui.mark(v, ok); ok ? SND.right() : SND.wrong();
        MP.myAns = { ep:g.ep, i:g.i, ok, t: Date.now() - MP.shownAt };
        mpPresence();
        $("qstat").textContent = ok ? "Right! Checking who was first…" : "Wrong. You're locked out of this one."; $("qstat").className = "status " + (ok ? "you" : "foe");
      });
      $("lv").onclick = () => mpLeave();
      startTimer(MP.shownAt + q.limit, q.limit, null);
    }
    const oa = opp && opp.presence.a;
    if (oa && oa.ep === g.ep && oa.i === g.i && $("bstat")) $("bstat").textContent = `${opp.presence.nick} has answered.`;
    return;
  }
  if (g.ph === "rev"){
    if (MP.shownKey !== key){
      MP.shownKey = key; stopTimer();
      const q = MP.q || buildQ(g.spec, GIDX);
      if (MP.ui){ MP.ui.lockUI(); MP.ui.reveal(); }
      const iWon = g.res.w === (MP.host ? "h" : "g"), theyWon = g.res.w && !iWon;
      tally(q.cat, !!(MP.myAns && MP.myAns.ok)); save();
      pullFx(iWon ? 1 : theyWon ? -1 : 0);
      readout(`LIVE · Q${g.i + 1}/${MAXQ}`);
      placard(`QUESTION ${g.i + 1}`, iWon ? "You pulled it!" : theyWon ? `${oppName} pulled it` : "Nobody got it", "Next question in a moment.");
      if ($("bstat")){ $("bstat").textContent = theyWon ? `${oppName} was first.` : iWon ? `You beat ${oppName} to it.` : "Nobody got it."; $("bstat").className = "status " + (iWon ? "you" : "foe"); }
      if ($("qstat")){ $("qstat").innerHTML = `<span class="mute">Answer:</span> <b style="color:var(--ink)">${esc(q.a)}</b>${q.fact ? `<br><span class="small mute">${esc(q.fact)}</span>` : ""}`; $("qstat").className = "status"; }
    }
    return;
  }
  if (g.ph === "end"){
    if (MP.shownKey !== key){
      MP.shownKey = key; stopTimer();
      const mine = (g.pos || 0) * meSign, s = mine > 0 ? 1 : mine < 0 ? 0 : .5;
      s === 1 ? SND.win() : s === 0 ? SND.lose() : null;
      readout("LIVE · FINAL"); placard("LIVE", s === 1 ? "You win!" : s === 0 ? oppName + " wins" : "Draw", "Good game.");
      scr(mfd(`<p class="verdict" style="color:${s === 1 ? "var(--you)" : s === 0 ? "var(--foe)" : "var(--ink)"}">${s === 1 ? "Victory" : s === 0 ? "Defeat" : "Draw"}</p>
          <p style="text-align:center">${esc(P.name || "You")} vs ${esc(oppName)}</p>`) +
        (MP.host ? `<button class="go big" id="mpAgain">Rematch</button>` : `<p class="mute" style="text-align:center">The host can start a rematch.</p>`) + `<button class="flat" id="lv">Leave</button>`);
      if (MP.host) $("mpAgain").onclick = () => { MP.g.ph = "lobby"; MP.g.pos = 0; MP.g.n = 0; mpPushG(); };
      $("lv").onclick = () => mpLeave();
    }
  }
}
function mpStart(){
  const g = MP.g; g.ep++; g.pos = 0; g.n = 0; mpNext();
}
function mpNext(){
  const g = MP.g, opp = mpOpp();
  const geoBoth = !!GIDX && !!(opp && opp.presence.geo);
  g.spec = chooseSpec(MP.r, g.diff, P.seen, { geo: geoBoth });
  g.i = g.n; g.ph = "q"; g.res = null; g.qt = Date.now();
  MP.myAns = null; MP.decided = false;
  mpPushG();
}
function mpLoop(){
  if (!MP) return;
  if (!MP.host){ mpSync(); return; }
  const g = MP.g; if (g.ph !== "q" || MP.decided) { mpSync(); return; }
  const opp = mpOpp(), q = MP.q; if (!q) return;
  const hA = MP.myAns && MP.myAns.ep === g.ep && MP.myAns.i === g.i ? MP.myAns : null;
  const oa = opp && opp.presence.a, gA = oa && oa.ep === g.ep && oa.i === g.i ? oa : null;
  const el = Date.now() - (MP.shownAt || g.qt);
  let w, decided = false;
  if (hA && hA.ok && gA && gA.ok){ w = hA.t <= gA.t ? "h" : "g"; decided = true; }
  else if (gA && gA.ok){ w = "g"; decided = true; }
  else if (hA && hA.ok && gA){ w = "h"; decided = true; }
  else if (hA && hA.ok && el > hA.t + 1500){ w = "h"; decided = true; }    // allow the guest's answer time to arrive
  else if (hA && gA){ w = null; decided = true; }
  else if (el > q.limit + 1500){ w = null; decided = true; }
  if (!decided){ mpSync(); return; }
  MP.decided = true;
  g.pos = Math.max(-TRACK, Math.min(TRACK, g.pos + (w === "h" ? 1 : w === "g" ? -1 : 0)));
  g.n++; g.ph = "rev"; g.res = { w };
  mpPushG();
  setTimeout(() => { if (!MP || !MP.host) return; if (Math.abs(MP.g.pos) >= TRACK || MP.g.n >= MAXQ){ MP.g.ph = "end"; mpPushG(); } else mpNext(); }, 4000);
}

/* ================= DRINKING GAME ================= */
let PT = null, adultOk = false;
function partyGate(){
  if (adultOk) return partySetup();
  idleCanopy(); readout("DRINKING GAME"); placard("", "Drinking game", "For over-18s only.");
  scr(mfd(`<h2 style="color:#ff8fc7">Before you start</h2><p>This mode is for people aged 18 and over. Any drink works: alcohol isn't needed, and squash counts.</p>
      <ul class="rules"><li>Sips, never shots or downing.</li><li>Anyone can switch to a soft drink at any time.</li><li>Keep water nearby. The game will remind you.</li></ul>
      <p class="small mute">For advice on drinking safely, see drinkaware.co.uk.</p>`) + `<button class="go big" id="ok18">We're all 18 or over</button><button class="flat" id="back">Back</button>`);
  $("ok18").onclick = () => { adultOk = true; partySetup(); }; $("back").onclick = home;
}
function partySetup(){
  const saved = P.party || { names:["", "", ""], target:8, diff:"easy", last:true };
  readout("DRINKING GAME · SETUP"); placard("", "Who's playing?", "Add 2–8 names. You'll pass the phone round in this order.");
  const draw = () => {
    scr(mfd(`<h2>Players</h2><div class="players" id="plist">${saved.names.map((n, i) => `<div class="prow"><input data-i="${i}" maxlength="14" value="${esc(n)}" placeholder="Player ${i + 1}" aria-label="Player ${i + 1} name">${saved.names.length > 2 ? `<button class="flat" data-del="${i}" aria-label="Remove player ${i + 1}">✕</button>` : ""}</div>`).join("")}</div>
        ${saved.names.length < 8 ? `<button class="flat" id="add">Add player</button>` : ""}`) +
      mfd(`<h2>Game length</h2><div class="seg" id="tseg">${[[5,"Quick","first to 5"],[8,"Normal","first to 8"],[12,"Long","first to 12"]].map(([v, l, s]) => `<button data-v="${v}" aria-pressed="${saved.target === v}">${l}<small>${s}</small></button>`).join("")}</div>
        <h2>Questions</h2><div class="seg" id="dseg">${["easy","standard","hard"].map(k => `<button data-v="${k}" aria-pressed="${saved.diff === k}">${DIFFS[k].name}</button>`).join("")}</div>
        <label class="toggle"><input type="checkbox" id="last" ${saved.last ? "checked" : ""}> Last place takes 3 sips at the end</label>`) +
      `<button class="go big" id="pstart">Start</button><p class="small" id="perr" style="color:var(--bad)"></p><button class="flat" id="back">Back to hangar</button>`);
    C.querySelectorAll("#plist input").forEach(inp => inp.oninput = () => { saved.names[Number(inp.dataset.i)] = inp.value; });
    C.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { saved.names.splice(Number(b.dataset.del), 1); draw(); });
    const add = $("add"); if (add) add.onclick = () => { saved.names.push(""); draw(); const ins = C.querySelectorAll("#plist input"); ins[ins.length - 1].focus(); };
    $("tseg").onclick = e => { const b = e.target.closest("button"); if (b){ saved.target = Number(b.dataset.v); draw(); } };
    $("dseg").onclick = e => { const b = e.target.closest("button"); if (b){ saved.diff = b.dataset.v; draw(); } };
    $("last").onchange = e => { saved.last = e.target.checked; };
    $("back").onclick = home;
    $("pstart").onclick = () => {
      const names = saved.names.map(n => n.trim()).filter(Boolean);
      if (names.length < 2){ $("perr").textContent = "Add at least two names."; return; }
      if (new Set(names.map(n => n.toLowerCase())).size !== names.length){ $("perr").textContent = "Each player needs a different name."; return; }
      P.party = saved; save();
      PT = { players:names.map(n => ({ name:n, score:0 })), target:saved.target, diff:saved.diff, last:saved.last, turn:0, count:0, r:rng32(newSeed()), rule:null };
      pPass();
    };
  };
  draw();
}
function pBoard(){
  const order = PT.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score);
  return `<ul class="board">${order.map((o, r) => `<li class="${o.i === PT.turn ? "now" : ""}"><span class="rk">${r + 1}</span><span class="nm">${esc(o.p.name)}</span><span class="sc">${o.p.score}/${PT.target}</span><span class="tr"><i style="width:${Math.min(100, o.p.score / PT.target * 100)}%"></i></span></li>`).join("")}</ul>`;
}
const leader = () => PT.players.reduce((a, b) => b.score > a.score ? b : a);
const lastP = () => PT.players.reduce((a, b) => b.score < a.score ? b : a);
function pNextQ(){ const sp = chooseSpec(PT.r, PT.diff, P.seen, { geo: !!GIDX }); markSeen(sp); save(); return buildQ(sp, GIDX); }
function pPass(){
  stopTimer(); qHandler = null; PT.phase = "pass";
  const pl = PT.players[PT.turn];
  idleCanopy(); readout(`DRINKING GAME · TURN ${PT.count + 1}`);
  placard("PASS THE PHONE", pl.name + "'s turn", "Hand the phone to " + pl.name + ".");
  scr(mfd(`<span class="eyebrow">Up next</span><h2 style="font-size:32px;color:var(--ink)">${esc(pl.name)}</h2>${PT.rule ? `<p class="small" style="color:var(--amber)">Rule in play: ${esc(PT.rule)}</p>` : ""}
      <p class="small mute">Right: +1 point. Wrong: 2 sips. Typed answers right: everyone else takes 1.</p>`) +
    mfd(`<h2>Scores</h2>${pBoard()}`) + `<button class="go big" id="ready">I'm ${esc(pl.name)} · Go</button><button class="flat" id="endp">End game</button>`);
  $("ready").onclick = pAsk; $("endp").onclick = pEnd;
  window.scrollTo(0, 0);
}
function pAsk(){
  const q = PT.q = pNextQ(), pl = PT.players[PT.turn], cat = catOf(q);
  tugView(cat.name, cat.col, "", ""); TUG.on = false;
  placard(pl.name.toUpperCase(), cat.name, "Answer before the timer runs out.");
  scr(timerBar() + `<div id="qa"></div>`);
  const ui = renderQuestion(q, q.kind === "map" ? "Tap it" : q.typed || q.kind === "grid" ? "Type it" : "Pick one", v => pResolve(ui, v));
  startTimer(Date.now() + q.limit, q.limit, () => { if (qHandler) qHandler(null); });
}
function pResolve(ui, v){
  stopTimer(); qHandler = null;
  const q = PT.q, ok = checkAnswer(q, v), pl = PT.players[PT.turn];
  ui.mark(v, ok); ui.reveal(); ok ? SND.right() : SND.wrong(); tally(q.cat, ok); save();
  const typed = q.typed || q.kind === "grid", lines = [];
  if (ok){ pl.score++; lines.push(["+1 point", "give"]); if (typed) lines.push(["Everyone else: 1 sip", "all"]); }
  else lines.push([`${pl.name}: drink 2 sips`, "drink"]);
  const won = pl.score >= PT.target;
  placard(pl.name.toUpperCase(), ok ? "Right!" : v === null ? "Out of time" : "Wrong", won ? pl.name + " reached " + PT.target + "!" : "Pass the phone on.");
  $("qa").insertAdjacentHTML("afterend", mfd(`${lines.map(l => `<p class="sip ${l[1]}">${esc(l[0])}</p>`).join("")}
      <p style="text-align:center"><span class="mute">Answer:</span> <b>${esc(q.a)}</b>${q.fact ? `<br><span class="small mute">${esc(q.fact)}</span>` : ""}</p>`) + `<button class="go big" id="nx">${won ? "Final scores" : "Next player"}</button>`);
  $("nx").onclick = () => { if (won) return pEnd(); PT.count++; PT.turn = (PT.turn + 1) % PT.players.length; if (PT.count % 5 === 0) pWild(); else pPass(); };
  $("nx").scrollIntoView({ block:"nearest" });
}
function pWild(){
  stopTimer(); PT.phase = "wild";
  const w = WILDCARDS[Math.floor(Math.random() * WILDCARDS.length)];
  SND.card(); TUG.on = false; overlay(`<span class="cat" style="top:42%;font-size:34px;color:var(--amber)">WILDCARD</span>`);
  readout("DRINKING GAME · WILDCARD"); placard("WILDCARD", w.title, "Everyone, look at the phone.");
  let body = `<div class="wild"><span class="eyebrow">Wildcard</span><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p>`, after = null;
  if (w.id === "quick"){ let q; do { q = pNextQ(); } while (q.kind !== "text"); body += `<p class="qtext">${esc(q.q)}</p><button class="go" id="rev">Reveal the answer</button><p class="sip all" id="ans" hidden>${esc(q.a)}</p>`; after = () => { $("rev").onclick = () => { $("ans").hidden = false; $("rev").hidden = true; }; }; }
  if (w.id === "hot") body += `<p><b>${esc(leader().name)}</b> is in the hot seat.</p>`;
  if (w.id === "rule") body += `<p><b>${esc(lastP().name)}</b>, make your rule.</p><form class="cinput" id="rf"><input id="rin" maxlength="80" placeholder="e.g. No saying 'drink'" style="text-transform:none" aria-label="Your rule"><button class="go">Set rule</button></form>`;
  if (w.id === "under"){ const L = lastP(); L.score += 1; body += `<p class="sip give">${esc(L.name)} +1 point</p>`; }
  body += `</div>`;
  scr(mfd(body) + `<button class="go big" id="nx">${w.id === "hot" ? "Start the hot seat" : "Continue"}</button>`);
  if (after) after();
  if (w.id === "rule"){ PT.rule = null; $("rf").onsubmit = e => { e.preventDefault(); const v = $("rin").value.trim(); PT.rule = v || null; $("rf").innerHTML = `<p style="color:var(--amber)">Rule set: ${esc(v || "no rule")}</p>`; }; }
  $("nx").onclick = () => w.id === "hot" ? pHot() : pPass();
  window.scrollTo(0, 0);
}
function pHot(){
  const L = leader(), q = pNextQ(), cat = catOf(q);
  placard("HOT SEAT", L.name + " answers", "Right: hand out 3 sips. Wrong: take 3.");
  scr(timerBar() + `<div id="qa"></div>`);
  const ui = renderQuestion(q, "Hot seat", v => {
    stopTimer(); qHandler = null; const ok = checkAnswer(q, v); ui.mark(v, ok); ui.reveal(); ok ? SND.right() : SND.wrong();
    placard("HOT SEAT", ok ? "Right!" : "Wrong", "Back to normal turns.");
    $("qa").insertAdjacentHTML("afterend", mfd(`<p class="sip ${ok ? "give" : "drink"}">${esc(L.name)}: ${ok ? "hand out 3 sips" : "drink 3 sips"}</p><p style="text-align:center"><span class="mute">Answer:</span> <b>${esc(q.a)}</b></p>`) + `<button class="go big" id="nx">Next player</button>`);
    $("nx").onclick = pPass;
  });
  startTimer(Date.now() + q.limit, q.limit, () => { if (qHandler) qHandler(null); });
}
function pEnd(){
  stopTimer(); qHandler = null;
  const order = PT.players.slice().sort((a, b) => b.score - a.score), win = order[0], low = order[order.length - 1];
  SND.win(); idleCanopy(); readout("DRINKING GAME · FINAL"); placard("", win.name + " wins", "Good game. Drink some water.");
  scr(mfd(`<p class="verdict" style="color:var(--amber);font-size:40px">${esc(win.name)} wins</p>${pBoard()}
      ${PT.last && order.length > 1 && low.score < win.score ? `<p class="sip drink">${esc(low.name)}: last place, 3 sips</p>` : ""}
      <p class="small mute" style="text-align:center">Everyone: a glass of water before the next game.</p>`) +
    `<div class="row"><button class="go big" id="again" style="flex:1">Play again</button><button class="flat" id="hm">Hangar</button></div>`);
  $("again").onclick = () => { PT = null; partySetup(); }; $("hm").onclick = home;
}

/* ================= CANOPY RENDERING ================= */
(function(){
  const cv = $("sky"), x = cv.getContext("2d"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stars = []; for (let i = 0; i < 160; i++) stars.push({ x:Math.random() * 2 - 1, y:Math.random() * 2 - 1, z:Math.random() });
  let last = performance.now(), W = 0, H = 0, dpr = 1;
  function fit(){ dpr = devicePixelRatio || 1; const w = cv.clientWidth, h = cv.clientHeight; if (Math.round(w * dpr) !== W || Math.round(h * dpr) !== H){ W = cv.width = Math.round(w * dpr); H = cv.height = Math.round(h * dpr); } }
  function frame(now){
    fit(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    x.fillStyle = "#02040a"; x.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.45, sp = still ? 0 : 0.08;
    for (const s of stars){
      s.z -= sp * dt; if (s.z <= 0.02){ s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; }
      const px = cx + s.x / s.z * W * 0.25, py = cy + s.y / s.z * H * 0.35;
      if (px < 0 || px > W || py < 0 || py > H){ s.z = 1; continue; }
      x.fillStyle = `rgba(210,220,255,${((1 - s.z) * 0.9 + 0.1).toFixed(2)})`; const r = Math.max(1, (1 - s.z) * 2.2) * dpr; x.fillRect(px, py, r, r);
    }
    if (TUG.on) drawTug(dt);
    requestAnimationFrame(frame);
  }
  function drawTug(dt){
    const y = H * 0.55, x0 = W * 0.12, x1 = W * 0.88, mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
    TUG.shown += (TUG.pos - TUG.shown) * Math.min(1, dt * (still ? 30 : 4));
    TUG.beamY = Math.max(0, TUG.beamY - dt * 0.9); TUG.beamF = Math.max(0, TUG.beamF - dt * 0.9); TUG.pulse = Math.max(0, TUG.pulse - dt * 1.5);
    x.strokeStyle = "rgba(255,180,61,.25)"; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke();
    for (let i = -TRACK; i <= TRACK; i++){
      const tx = mid - i / TRACK * half, big = i === 0 || Math.abs(i) === TRACK;
      x.strokeStyle = i === 0 ? "rgba(255,180,61,.6)" : i > 0 ? "rgba(85,198,255,.4)" : "rgba(255,79,94,.4)";
      x.lineWidth = (big ? 2 : 1.5) * dpr; x.beginPath(); x.moveTo(tx, y - (big ? 11 : 7) * dpr); x.lineTo(tx, y + (big ? 11 : 7) * dpr); x.stroke();
    }
    const g1 = x.createLinearGradient(x0 - 30 * dpr, 0, x0 + 40 * dpr, 0); g1.addColorStop(0, "rgba(85,198,255,.35)"); g1.addColorStop(1, "rgba(85,198,255,0)"); x.fillStyle = g1; x.fillRect(x0 - 30 * dpr, y - 40 * dpr, 70 * dpr, 80 * dpr);
    const g2 = x.createLinearGradient(x1 + 30 * dpr, 0, x1 - 40 * dpr, 0); g2.addColorStop(0, "rgba(255,79,94,.35)"); g2.addColorStop(1, "rgba(255,79,94,0)"); x.fillStyle = g2; x.fillRect(x1 - 40 * dpr, y - 40 * dpr, 70 * dpr, 80 * dpr);
    const ship = (sx, dir, col) => { const s = 14 * dpr; x.fillStyle = col; x.shadowColor = col; x.shadowBlur = 12 * dpr; x.beginPath(); x.moveTo(sx + dir * s, y); x.lineTo(sx - dir * s * .7, y - s * .8); x.lineTo(sx - dir * s * .3, y); x.lineTo(sx - dir * s * .7, y + s * .8); x.closePath(); x.fill(); x.shadowBlur = 0; };
    ship(x0 - 18 * dpr, 1, "#55c6ff"); ship(x1 + 18 * dpr, -1, "#ff4f5e");
    const px = mid - TUG.shown / TRACK * half, pr = (18 + TUG.pulse * 6) * dpr;
    x.setLineDash([6 * dpr, 6 * dpr]);
    if (TUG.beamY > 0){ x.strokeStyle = `rgba(85,198,255,${(TUG.beamY * .8).toFixed(2)})`; x.lineWidth = 3 * dpr; x.beginPath(); x.moveTo(x0 - 4 * dpr, y); x.lineTo(px - pr, y); x.stroke(); }
    if (TUG.beamF > 0){ x.strokeStyle = `rgba(255,79,94,${(TUG.beamF * .8).toFixed(2)})`; x.lineWidth = 3 * dpr; x.beginPath(); x.moveTo(x1 + 4 * dpr, y); x.lineTo(px + pr, y); x.stroke(); }
    x.setLineDash([]);
    const gr = x.createRadialGradient(px - pr * .35, y - pr * .4, pr * .1, px, y, pr);
    gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(.3, TUG.col); gr.addColorStop(1, "#05070c");
    x.shadowColor = TUG.col; x.shadowBlur = 24 * dpr; x.fillStyle = gr; x.beginPath(); x.arc(px, y, pr, 0, 6.283); x.fill(); x.shadowBlur = 0;
  }
  requestAnimationFrame(frame);
})();

home();
