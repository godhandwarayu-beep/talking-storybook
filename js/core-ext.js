/* นิทานพูดได้ — shared helpers for the classroom features
   server connection + offline queue, student session, progress, hard-word bank,
   difficulty level, voice recording/analysis, fireworks + applause. */
'use strict';

/* ---------------- server (Google Apps Script web app) ---------------- */
(function readServerFromLink() {
  // a teacher can share  …/?server=<web app url>  so student devices connect with no setup
  try {
    const q = new URLSearchParams(location.search).get('server');
    if (q && /^https:\/\/script\.google(usercontent)?\.com\//.test(q)) lsSet('tsb-server', q);
  } catch (e) {}
})();
const serverUrl = () => String(lsGet('tsb-server', '') || (window.TSB_CONFIG && TSB_CONFIG.SERVER) || '').trim();
const hasServer = () => !!serverUrl();

async function api(action, data = {}, timeout = 25000) {
  const url = serverUrl();
  if (!url) throw new Error('no_server');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    // text/plain keeps this a "simple" request (no CORS preflight), which Apps Script requires
    const r = await fetch(url, { method: 'POST', body: JSON.stringify(Object.assign({ action }, data)), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal, redirect: 'follow' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'server_error');
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('timeout');
    throw e;
  } finally { clearTimeout(t); }
}
const API_ERR = {
  no_server: 'ยังไม่ได้เชื่อมต่อระบบเก็บผล', timeout: 'เชื่อมต่อช้าเกินไป ลองใหม่อีกครั้ง', wrong_pin: 'รหัสไม่ถูกต้อง',
  wrong_teacher_pin: 'รหัสครูไม่ถูกต้อง', not_logged_in: 'กรุณาเข้าสู่ระบบใหม่', not_setup: 'ระบบเก็บผลยังไม่ได้กด setup ใน Apps Script'
};
const apiErr = e => API_ERR[e && e.message] || 'เชื่อมต่อระบบเก็บผลไม่ได้ ตรวจอินเทอร์เน็ต';

/* offline-safe sending: everything goes into a queue on this device first */
async function enqueue(action, data) {
  const k = 'queue|' + Date.now() + '|' + Math.random().toString(36).slice(2, 6);
  await hqDB.put(k, { action, data });
  flushQueue();
}
let flushing = false;
async function flushQueue() {
  if (flushing || !hasServer() || !navigator.onLine) return;
  flushing = true;
  try {
    const keys = ((await hqDB.keys()) || []).filter(k => typeof k === 'string' && k.startsWith('queue|')).sort();
    for (const k of keys) {
      const item = await hqDB.get(k); if (!item) continue;
      try { await api(item.action, item.data, 60000); await hqDB.del(k); }
      catch (e) { if (e.message === 'not_logged_in' || e.message === 'bad_json') await hqDB.del(k); else break; }
    }
  } finally { flushing = false; updateSyncBadge(); }
}
async function pendingCount() { return ((await hqDB.keys()) || []).filter(k => typeof k === 'string' && k.startsWith('queue|')).length; }
async function updateSyncBadge() {
  const el = document.getElementById('syncBadge'); if (!el) return;
  const n = await pendingCount();
  el.hidden = !n || !hasServer(); el.textContent = 'รอส่ง ' + n;
}
window.addEventListener('online', flushQueue);
setInterval(flushQueue, 60000);
// hqDB (from the main app) gains a delete
if (!hqDB.del) hqDB.del = async k => { try { const r = indexedDB.open('tsb-tts', 1); await new Promise(res => { r.onsuccess = () => { const t = r.result.transaction('clips', 'readwrite'); t.objectStore('clips').delete(k); t.oncomplete = res; t.onerror = res; }; r.onerror = res; }); } catch (e) {} };

/* ---------------- student session ---------------- */
let ME = lsGet('tsb-me', null);              // {id, room, no, name, nick, token, voice, local}
const meId = () => ME ? ME.id : 'guest';
const meName = () => ME ? (ME.nick || ME.name) : '';
function setMe(m) { ME = m; lsSet('tsb-me', m); document.dispatchEvent(new CustomEvent('tsb:me')); }

/* ---------------- progress per student per book ---------------- */
const progKey = () => 'tsb-prog-' + meId();
function allProgress() { return lsGet(progKey(), {}); }
function bookProg(bookId) { return allProgress()[bookId] || {}; }       // {stageIndex: stars}
function saveStage(bookId, i, stars) {
  const all = allProgress(), p = all[bookId] || {};
  if (!p[i] || stars > p[i]) p[i] = stars;
  all[bookId] = p; lsSet(progKey(), all);
}
function mergeProgress(server) {
  const all = allProgress();
  Object.entries(server || {}).forEach(([b, st]) => { const p = all[b] || {}; Object.entries(st).forEach(([i, s]) => { if (!p[i] || s > p[i]) p[i] = s; }); all[b] = p; });
  lsSet(progKey(), all);
}
function totalStars() { return Object.values(allProgress()).reduce((a, p) => a + Object.values(p).reduce((x, y) => x + (+y || 0), 0), 0); }
function finishedBooks() { return mergedBooks().filter(b => { const p = bookProg(b.id); return b.pages.every((_, i) => p[i] > 0); }); }
window.bookProgressText = b => {
  const p = bookProg(b.id), done = b.pages.filter((_, i) => p[i] > 0).length;
  return done ? ` · ผ่าน ${done}/${b.pages.length}` : '';
};

/* ---------------- hard-word bank (spaced review, Leitner boxes 1–5) ---------------- */
const wordsKey = () => 'tsb-words-' + meId();
const BOX_DAYS = [0, 0, 1, 3, 7, 21];
function wordBank() { return lsGet(wordsKey(), {}); }
function noteHardWords(list) {
  const bank = wordBank(), now = Date.now();
  list.forEach(w => { const e = bank[w] || { miss: 0, box: 1 }; e.miss++; e.box = 1; e.due = now; bank[w] = e; });
  lsSet(wordsKey(), bank);
}
function reviewWord(w, ok) {
  const bank = wordBank(), e = bank[w] || { miss: 0, box: 1 };
  e.box = ok ? Math.min(5, e.box + 1) : 1;
  e.due = Date.now() + BOX_DAYS[e.box] * 864e5;
  bank[w] = e; lsSet(wordsKey(), bank);
}
function dueWords(max = 10) {
  const now = Date.now();
  return Object.entries(wordBank()).filter(([, e]) => e.box < 5 && (e.due || 0) <= now).sort((a, b) => a[1].box - b[1].box || b[1].miss - a[1].miss).slice(0, max).map(([w]) => w);
}
function mergeServerWords(list) {
  const bank = wordBank();
  (list || []).forEach(x => { if (x.miss > x.learned && !bank[x.w]) bank[x.w] = { miss: x.miss, box: 1, due: Date.now() }; });
  lsSet(wordsKey(), bank);
}

/* ---------------- local reading log (works without a server too) ---------------- */
async function saveLog(rec, clipB64, mime) {
  rec = Object.assign({ time: Date.now(), id: meId(), room: ME && ME.room || '', no: ME && ME.no || '', name: ME ? ME.name : 'ไม่ได้ลงชื่อ' }, rec);
  await hqDB.put('log|' + rec.time + '|' + Math.random().toString(36).slice(2, 5), Object.assign({}, rec, { hasClip: !!clipB64 }));
  if (clipB64) await hqDB.put('clip|' + rec.time, { b64: clipB64, mime });
  if (ME && !ME.local && hasServer()) await enqueue('log', { id: ME.id, token: ME.token, rec, clip: clipB64 || '', mime: mime || '' });
}
async function localLogs() {
  const keys = ((await hqDB.keys()) || []).filter(k => typeof k === 'string' && k.startsWith('log|'));
  const out = []; for (const k of keys) { const v = await hqDB.get(k); if (v) out.push(v); }
  return out.sort((a, b) => a.time - b.time);
}

/* ---------------- difficulty level of a book ---------------- */
function analyzeBook(b) {
  const r = { words: 0, unique: 0, syllables: 0, cluster: 0, lead: 0, hlead: 0, irregular: 0, karan: 0, tone: 0, number: 0 };
  const seen = new Set();
  b.pages.forEach(pg => tokenize(pg.text).forEach(tk => {
    if (!tk.readable) return;
    r.words++;
    const w = tk.t.replace(/[\/ๆ]/g, '');
    if (seen.has(w)) return; seen.add(w);
    if (isNumber(w)) { r.number++; r.syllables++; return; }
    if (IRREGULAR[w] && IRREGULAR[w] !== w) r.irregular++;
    const parts = thaiSpell(w) || [];
    const syl = parts.filter(p => p.kind === 's').length || 1;
    r.syllables += syl;
    parts.forEach(p => {
      if (/ควบกล้ำ/.test(p.label)) r.cluster++;
      if (/อักษรนำ/.test(p.label)) r.lead++;
      else if (/ห นำ|อ นำ/.test(p.label)) r.hlead++;   // หนู หมา อยาก: taught early, weighs less
      if (p.kind === 'k') r.karan++;
      if (p.kind === 't' && /ไม้(เอก|โท|ตรี|จัตวา)/.test(p.label)) r.tone++;
    });
  }));
  r.unique = seen.size;
  const u = Math.max(1, r.unique);
  r.avgSyl = +(r.syllables / u).toFixed(2);
  // tone marks and ห นำ are part of ป.1; clusters, true อักษรนำ, การันต์ and irregular words make a text harder
  r.score = +(((r.cluster * 1.5 + r.lead * 2.5 + r.hlead * 0.6 + r.irregular * 3 + r.karan * 2.5 + r.tone * 0.12) / u) + (r.avgSyl - 1) * 1.2 + Math.min(1, r.words / 150) * 0.25).toFixed(2);
  r.level = r.score < 0.5 ? 'ง่าย' : r.score < 1 ? 'ปานกลาง' : 'ท้าทาย';
  r.grade = r.score < 0.5 ? 'ป.1' : r.score < 1 ? 'ป.2' : 'ป.3 ขึ้นไป';
  return r;
}
const levelCache = new Map();
function bookLevel(b) {
  const k = b.id + '|' + (b.updated || 0);
  if (!levelCache.has(k)) levelCache.set(k, analyzeBook(b));
  return levelCache.get(k);
}
window.bookBadge = b => { const l = bookLevel(b); return `<span class="lvl lvl-${l.level === 'ง่าย' ? 1 : l.level === 'ปานกลาง' ? 2 : 3}">${l.level} · ${l.grade}</span>`; };

/* ---------------- microphone recording + voice analysis ---------------- */
async function openMic() {
  return navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, channelCount: 1 } });
}
// record for up to `ms`; onLevel(0..1) for a live meter; resolves {blob, mime}
function recordFor(ms, onLevel, stopSignal) {
  return new Promise(async (resolve, reject) => {
    let stream;
    try { stream = await openMic(); } catch (e) { reject(new Error('mic_denied')); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
    let rec;
    try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); reject(new Error('no_recorder')); return; }
    const chunks = []; let meterT = null;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const an = actx.createAnalyser(); an.fftSize = 1024; actx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      meterT = setInterval(() => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; const db = 10 * Math.log10(s / buf.length + 1e-10); onLevel && onLevel(Math.max(0, Math.min(1, (db + 55) / 40))); }, 60);
    } catch (e) {}
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { clearInterval(meterT); stream.getTracks().forEach(t => t.stop()); resolve({ blob: new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }), mime: rec.mimeType || mime || 'audio/webm' }); };
    rec.start();
    const timer = setTimeout(() => rec.state !== 'inactive' && rec.stop(), ms);
    if (stopSignal) stopSignal.stop = () => { clearTimeout(timer); if (rec.state !== 'inactive') rec.stop(); };
  });
}
async function blobToB64(blob) { const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
// pitch (F0) by autocorrelation on voiced frames + brightness from zero-crossings
async function analyzeVoice(blob) {
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  const dec = await actx.decodeAudioData(await blob.arrayBuffer());
  const sr = 16000, len = Math.max(1, Math.round(dec.duration * sr));
  const off = new OfflineAudioContext(1, len, sr);
  const src = off.createBufferSource(); src.buffer = dec; src.connect(off.destination); src.start();
  const x = (await off.startRendering()).getChannelData(0);
  const N = 1024, hop = 400, frames = [];
  let peak = 0;
  for (let i = 0; i + N < x.length; i += hop) { let e = 0; for (let k = 0; k < N; k++) e += x[i + k] * x[i + k]; const rms = Math.sqrt(e / N); frames.push([i, rms]); peak = Math.max(peak, rms); }
  const gate = Math.max(0.015, peak * 0.3), f0s = [], zcrs = [];
  const minLag = Math.floor(sr / 500), maxLag = Math.floor(sr / 70);
  for (const [i, rms] of frames) {
    if (rms < gate) continue;
    let e0 = 0; for (let k = 0; k < N; k++) e0 += x[i + k] * x[i + k];
    let best = 0, lag = 0;
    for (let L = minLag; L <= maxLag; L++) { let c = 0; for (let k = 0; k + L < N; k++) c += x[i + k] * x[i + k + L]; c /= e0; if (c > best) { best = c; lag = L; } }
    if (best > 0.55 && lag) f0s.push(sr / lag);
    let z = 0; for (let k = 1; k < N; k++) if ((x[i + k] >= 0) !== (x[i + k - 1] >= 0)) z++;
    zcrs.push(z * sr / (2 * N));
  }
  const med = a => { if (!a.length) return 0; const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
  return { f0: Math.round(med(f0s)), centroid: Math.round(med(zcrs)), voiced: +(f0s.length * hop / sr).toFixed(2), peak: +peak.toFixed(3) };
}
// compare a spot check with the enrolled voice. Never shown to the child, only to the teacher.
function voiceVerdict(sample, profile) {
  if (!sample || sample.voiced < 0.25 || !sample.f0) return 'ไม่ได้ยินเสียงชัด';
  if (sample.f0 < 175) return 'เสียงทุ้มคล้ายผู้ใหญ่ ควรฟังซ้ำ';
  if (profile && profile.f0) {
    const d = Math.abs(sample.f0 - profile.f0) / profile.f0;
    if (d > 0.2) return 'เสียงต่างจากที่ลงทะเบียน ควรฟังซ้ำ';
  }
  return 'ผ่าน';
}

/* ---------------- owl outfits (rewards) ---------------- */
const OUTFITS = [
  { id: 'none', name: 'ไม่ใส่', stars: 0, svg: '' },
  { id: 'party', name: 'หมวกปาร์ตี้', stars: 5, svg: '<polygon points="40,-6 30,16 50,16" fill="#ff7ab6" stroke="#2b2350" stroke-width="2.5" stroke-linejoin="round"/><circle cx="40" cy="-7" r="4" fill="#ffb020" stroke="#2b2350" stroke-width="2"/><path d="M34 9h12M32 13h16" stroke="#fff" stroke-width="2"/>' },
  { id: 'glasses', name: 'แว่นนักอ่าน', stars: 15, svg: '<circle cx="29" cy="34" r="12" fill="none" stroke="#2b2350" stroke-width="3"/><circle cx="51" cy="34" r="12" fill="none" stroke="#2b2350" stroke-width="3"/><path d="M41 34h-2" stroke="#2b2350" stroke-width="3"/>' },
  { id: 'scarf', name: 'ผ้าพันคอ', stars: 30, svg: '<path d="M18 58q22 12 44 0v7q-22 12-44 0z" fill="#ef4f5f" stroke="#2b2350" stroke-width="2.5"/><path d="M52 64l4 14 6-3-4-12" fill="#ef4f5f" stroke="#2b2350" stroke-width="2.5" stroke-linejoin="round"/>' },
  { id: 'crown', name: 'มงกุฎราชาการอ่าน', stars: 50, svg: '<path d="M24 16l4-14 7 9 5-11 5 11 7-9 4 14z" fill="#ffd34d" stroke="#2b2350" stroke-width="2.5" stroke-linejoin="round"/><circle cx="40" cy="10" r="2.5" fill="#ef4f5f"/>' },
  { id: 'cape', name: 'ผ้าคลุมฮีโร่', stars: 80, back: true, svg: '<path d="M14 40q-8 30 4 38h44q12-8 4-38z" fill="#3b7cf6" stroke="#2b2350" stroke-width="2.5" stroke-linejoin="round"/>' }
];
const outfitKey = () => 'tsb-outfit-' + meId();
function currentOutfit() { const o = OUTFITS.find(x => x.id === lsGet(outfitKey(), 'none')) || OUTFITS[0]; return totalStars() >= o.stars ? o : OUTFITS[0]; }
function renderOwls() {
  const o = currentOutfit();
  document.querySelectorAll('svg[data-owl]').forEach(svg => {
    svg.setAttribute('viewBox', '0 -10 80 92');
    svg.innerHTML = (o.back ? o.svg : '') + OWL + (o.back ? '' : o.svg);
  });
}
document.addEventListener('tsb:me', renderOwls);

/* ---------------- big celebration: fireworks, applause, fanfare ---------------- */
function fireworks(canvas, seconds = 6) {
  const g = canvas.getContext('2d'); let W, H;
  const fit = () => { W = canvas.width = canvas.clientWidth * devicePixelRatio; H = canvas.height = canvas.clientHeight * devicePixelRatio; };
  fit(); window.addEventListener('resize', fit);
  const cols = ['#ffb020', '#18c3a5', '#3b7cf6', '#ef4f5f', '#8b6cf0', '#ff7ab6', '#ffffff'];
  const parts = [], rockets = [];
  const end = performance.now() + seconds * 1000;
  let last = 0, raf;
  function launch() { rockets.push({ x: W * (0.15 + Math.random() * 0.7), y: H, vx: (Math.random() - 0.5) * 2, vy: -(H / 70) * (0.85 + Math.random() * 0.3), c: cols[Math.floor(Math.random() * cols.length)] }); }
  function burst(r) { const n = 70 + Math.random() * 40; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = Math.random() * 6 * devicePixelRatio + 1; parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: Math.random() < 0.3 ? '#fff' : r.c }); } boom(); }
  function frame(t) {
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    if (t < end && t - last > 380) { launch(); if (Math.random() < 0.5) launch(); last = t; }
    for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.x += r.vx; r.y += r.vy; r.vy += 0.12 * devicePixelRatio; g.fillStyle = r.c; g.beginPath(); g.arc(r.x, r.y, 3 * devicePixelRatio, 0, 7); g.fill(); if (r.vy >= -1) { burst(r); rockets.splice(i, 1); } }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.06 * devicePixelRatio; p.vx *= 0.985; p.life -= 0.012; if (p.life <= 0) { parts.splice(i, 1); continue; } g.globalAlpha = p.life; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.4 * devicePixelRatio, 0, 7); g.fill(); g.globalAlpha = 1; }
    if (t < end + 2500 || parts.length) raf = requestAnimationFrame(frame); else { g.clearRect(0, 0, W, H); window.removeEventListener('resize', fit); }
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
function boom() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const n = actx.createBufferSource(); n.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.6);
    const gn = actx.createGain(); gn.gain.setValueAtTime(0.5, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    n.connect(f); f.connect(gn); gn.connect(actx.destination); n.start(t); n.stop(t + 0.8);
  } catch (e) {}
}
// a crowd clapping: many short filtered noise bursts at random times
function applause(seconds = 4) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (!noiseBuf) magicSound(false);
    const t0 = actx.currentTime, out = actx.createGain(); out.gain.value = 0.9; out.connect(actx.destination);
    const claps = Math.round(seconds * 40);
    for (let i = 0; i < claps; i++) {
      const t = t0 + Math.random() * seconds * (0.4 + 0.6 * Math.random());
      const n = actx.createBufferSource(); n.buffer = noiseBuf;
      const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 1800; bp.Q.value = 1.2;
      const g = actx.createGain(); const fade = 1 - Math.max(0, (t - t0) / seconds - 0.6) * 2;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * Math.max(0.05, fade), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      n.connect(bp); bp.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + 0.08);
    }
  } catch (e) {}
}
function fanfare() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime + 0.05, notes = [[523, 0, .18], [659, .18, .18], [784, .36, .18], [1047, .54, .55], [784, .95, .18], [1047, 1.13, .9]];
    notes.forEach(([f, at, d]) => [1, 2].forEach(h => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = h === 1 ? 'sawtooth' : 'triangle'; o.frequency.value = f * h;
      const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(h === 1 ? 0.16 : 0.08, t0 + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + d + 0.25);
      o.connect(lp); lp.connect(g); g.connect(actx.destination); o.start(t0 + at); o.stop(t0 + at + d + 0.3);
    }));
  } catch (e) {}
}

/* ---------------- small UI helpers shared by the modules ---------------- */
function addStyle(css) { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
function addSection(id, html) { const s = document.createElement('section'); s.id = id; s.hidden = true; s.innerHTML = html; document.querySelector('.wrap').appendChild(s); return s; }
function addOverlay(id, html) { const d = document.createElement('div'); d.id = id; d.hidden = true; d.innerHTML = html; document.body.appendChild(d); return d; }
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  test: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6v3H9zM7 6H5v15h14V6h-2"/><path d="M8 13l3 3 5-6"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>'
};

addStyle(`
.lvl{position:absolute;top:10px;left:10px;z-index:2;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:var(--shadow-sm)}
.book{position:relative}
.lvl-1{color:#0b7a4f}.lvl-2{color:#9a6200}.lvl-3{color:#b0202f}
#syncBadge{font-size:12px;font-weight:700;color:#9a6200;background:#fff4d6;border-radius:999px;padding:4px 10px}
.me-chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:4px 14px 4px 4px;font-weight:700;font-size:14px;box-shadow:var(--shadow-sm);max-width:52vw}
.me-chip svg[data-owl]{width:34px;height:34px;flex:none}
.me-chip .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.me-chip .st{color:var(--sun-deep);font-variant-numeric:tabular-nums}
.big-modal{position:fixed;inset:0;z-index:55;display:grid;place-items:center;padding:16px;background:rgba(19,35,58,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.big-modal .card{background:var(--card);border-radius:28px;padding:24px;width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;box-shadow:var(--shadow-lg);text-align:center;display:grid;gap:14px;animation:rise .3s ease-out}
.big-modal h3{margin:0;font-size:24px}
.meter{height:14px;border-radius:99px;background:#e6ebf2;overflow:hidden}
.meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--teal),var(--sun));transition:width .06s linear}
.say-word{font-family:var(--f-read);font-size:clamp(44px,12vw,72px);font-weight:700;line-height:1.2}
`);
