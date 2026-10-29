/* นิทานพูดได้ — presentation layer:
   1) พี่ฮูกพูดแล้วขยับปาก/ปีก + คำพูดขึ้นบนจอ (พิมพ์ตามเสียง)
   2) หน้าเปิดโปรแกรม: โลโก้ สพป.อย.2 + เสียงเปิดตัว + สลายเป็นละอองแสง
   3) เพลงพื้นหลังผ่อนคลายในหน้าเมนู (หยุดเองตอนอ่าน/อัดเสียง/พี่ฮูกพูด) */
(function () {
'use strict';

const ctx = () => {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
};
const visible = id => { const el = document.getElementById(id); return !!el && !el.hidden; };
const currentView = () => { const s = document.querySelector('.wrap > section:not([hidden])'); return s ? s.id : ''; };
const OVERLAYS = ['rtCheer', 'resultBox', 'stageWin', 'finale', 'rtIntro', 'voiceModal', 'summary'];

addStyle(`
/* ---------- talking owl ---------- */
svg[data-owl] .owl-wing,svg[data-owl] .owl-jaw,svg[data-owl] .owl-mouth,svg[data-owl] .owl-pupils{transform-box:fill-box}
svg[data-owl] .owl-wing-l{transform-origin:85% 8%}
svg[data-owl] .owl-wing-r{transform-origin:15% 8%}
svg[data-owl] .owl-jaw{transform-origin:50% 0}
svg[data-owl] .owl-mouth{transform-origin:50% 30%;opacity:0}
svg[data-owl] .owl-pupils{transform-origin:50% 50%;animation:owlBlink 5s infinite}
@keyframes owlBlink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
body.owl-talking svg.owl .owl-jaw{animation:owlJaw .2s ease-in-out infinite alternate}
body.owl-talking svg.owl .owl-mouth{opacity:1;animation:owlMouth .2s ease-in-out infinite alternate}
body.owl-talking svg.owl .owl-wing-l{animation:owlFlapL .42s ease-in-out infinite alternate}
body.owl-talking svg.owl .owl-wing-r{animation:owlFlapR .42s ease-in-out infinite alternate}
@keyframes owlJaw{from{transform:translateY(0)}to{transform:translateY(3.6px) scaleY(1.15)}}
@keyframes owlMouth{from{transform:scaleY(.25)}to{transform:scaleY(1.15)}}
@keyframes owlFlapL{from{transform:rotate(0)}to{transform:rotate(26deg)}}
@keyframes owlFlapR{from{transform:rotate(0)}to{transform:rotate(-26deg)}}
@keyframes capBlink{50%{opacity:0}}
@keyframes inFade{to{opacity:1}}

/* ---------- caption bar ---------- */
#owlCap{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);z-index:70;width:min(640px,calc(100vw - 24px));
  display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:10px 18px 10px 10px;border-radius:22px;
  background:rgba(19,35,58,.9);color:#fff;box-shadow:0 18px 40px rgba(19,35,58,.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  opacity:0;pointer-events:none;transition:opacity .3s,transform .3s}
#owlCap.show{opacity:1;transform:translate(-50%,0)}
#owlCap svg{width:54px;height:60px}
#owlCap .tx{font-size:clamp(16px,2.4vw,20px);line-height:1.5;min-height:1.5em}
#owlCap .tx b{color:#ffd66b;font-weight:700;margin-right:6px}
#owlCap .cur,.rti-bubble .cur{display:inline-block;width:.45em;height:1em;vertical-align:-.12em;background:currentColor;opacity:.55;margin-left:2px;animation:capBlink .7s steps(2) infinite}

/* ---------- music toggle ---------- */
#bgmBtn{position:fixed;left:calc(14px + env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:35;width:48px;height:48px;border-radius:50%;border:0;
  background:rgba(255,255,255,.92);box-shadow:0 8px 22px rgba(19,35,58,.18);display:grid;place-items:center;cursor:pointer;color:var(--ink)}
#bgmBtn[hidden]{display:none}
#bgmBtn .bars{display:flex;gap:3px;align-items:flex-end;height:18px}
#bgmBtn .bars i{width:4px;height:6px;border-radius:2px;background:var(--teal,#18c3a5)}
#bgmBtn.on .bars i{animation:bgmBar .9s ease-in-out infinite alternate}
#bgmBtn.on .bars i:nth-child(2){animation-delay:.25s}#bgmBtn.on .bars i:nth-child(3){animation-delay:.5s}
@keyframes bgmBar{from{height:4px}to{height:18px}}
#bgmBtn:not(.on) .bars i{background:#b8c2d0}
#bgmBtn:not(.on)::after{content:"";position:absolute;width:30px;height:3px;background:#e05a5a;border-radius:2px;transform:rotate(-45deg)}

/* ---------- intro ---------- */
#intro{position:fixed;inset:0;z-index:10000;overflow:hidden;display:grid;place-items:center;cursor:pointer;color:#e9f6ff;
  background:radial-gradient(900px 600px at 50% 45%,#143a7a 0%,#0a1a3c 45%,#040a1a 100%);transition:opacity .7s ease}
#intro.in-out{opacity:0;pointer-events:none}
#intro canvas{position:absolute;inset:0;width:100%;height:100%}
#intro .in-grid{position:absolute;left:-50%;right:-50%;bottom:-10%;height:55%;transform:perspective(420px) rotateX(62deg);transform-origin:50% 100%;
  background-image:linear-gradient(rgba(90,190,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(90,190,255,.35) 1px,transparent 1px);background-size:56px 56px;
  -webkit-mask-image:linear-gradient(to top,#000 10%,transparent 85%);mask-image:linear-gradient(to top,#000 10%,transparent 85%);animation:inGrid 3s linear infinite}
@keyframes inGrid{to{background-position:0 56px}}
#intro .in-stage{position:relative;display:grid;justify-items:center;gap:14px;text-align:center;padding:16px}
#intro .in-logo-wrap{position:relative;width:min(58vw,46vh,360px);aspect-ratio:806/773}
#intro .in-logo{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 22px rgba(80,170,255,.55));
  clip-path:inset(100% -40% -40% -40%);animation:inReveal 1.3s cubic-bezier(.2,.7,.2,1) .25s forwards}
@keyframes inReveal{to{clip-path:inset(-40% -40% -40% -40%)}}
#intro .in-scan{position:absolute;left:-6%;right:-6%;height:3px;top:100%;background:linear-gradient(90deg,transparent,#7ff3ff,#fff,#7ff3ff,transparent);box-shadow:0 0 18px 4px rgba(127,243,255,.8);
  opacity:0;animation:inScan 1.3s cubic-bezier(.2,.7,.2,1) .25s forwards}
@keyframes inScan{0%{top:100%;opacity:1}92%{opacity:1}100%{top:0;opacity:0}}
#intro .in-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none;-webkit-mask:url(logo-aya2.png) center/contain no-repeat;mask:url(logo-aya2.png) center/contain no-repeat}
#intro .in-shine::before{content:"";position:absolute;top:-20%;bottom:-20%;width:35%;left:-60%;transform:skewX(-20deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent)}
#intro.in-go .in-shine::before{animation:inShine .9s ease-in-out .15s}
@keyframes inShine{to{left:130%}}
#intro .in-ring{position:absolute;left:50%;top:50%;width:100%;aspect-ratio:1;border-radius:50%;border:2px solid rgba(127,243,255,.7);transform:translate(-50%,-50%) scale(.3);opacity:0;pointer-events:none}
#intro.in-boom .in-ring{animation:inRing 1.4s cubic-bezier(.1,.6,.2,1) forwards}
#intro.in-boom .in-ring.in-r2{animation-delay:.18s;border-color:rgba(255,200,90,.7)}
@keyframes inRing{0%{opacity:1;transform:translate(-50%,-50%) scale(.3)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.6)}}
#intro.in-go .in-logo-wrap{animation:inPulse 1.45s cubic-bezier(.3,0,.2,1) forwards}
@keyframes inPulse{0%{transform:scale(1)}80%{transform:scale(.96)}88%{transform:scale(1.1)}100%{transform:scale(1.04)}}
#intro.in-boom .in-logo{filter:drop-shadow(0 0 30px rgba(127,243,255,.95)) brightness(1.15)}
#intro .in-sub{font-size:clamp(14px,2.2vw,18px);letter-spacing:.06em;color:#9fd6ff;opacity:0;animation:inFade .8s ease 1.2s forwards}
#intro .in-title{font-size:clamp(30px,6vw,52px);font-weight:800;margin:0;line-height:1.2;opacity:0;transform:translateY(14px);
  background:linear-gradient(90deg,#7ff3ff,#ffffff,#ffd66b);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 30px rgba(127,243,255,.35)}
#intro.in-boom .in-title{animation:inTitle .7s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes inTitle{to{opacity:1;transform:none}}
#intro .in-tap{margin-top:6px;padding:12px 26px;border-radius:999px;border:1.5px solid rgba(127,243,255,.6);background:rgba(127,243,255,.08);font-size:clamp(16px,2.4vw,20px);
  opacity:0;animation:inFade .6s ease 1.6s forwards,inTap 1.6s ease-in-out 2.2s infinite}
@keyframes inTap{50%{box-shadow:0 0 0 10px rgba(127,243,255,0),0 0 24px rgba(127,243,255,.5);background:rgba(127,243,255,.18)}}
#intro.in-go .in-tap{animation:none;opacity:0;transition:opacity .3s}
#intro.in-dissolve .in-logo,#intro.in-dissolve .in-shine{visibility:hidden}
#intro.in-dissolve .in-title,#intro.in-dissolve .in-sub{transition:opacity .9s .4s,filter .9s .4s;opacity:0;filter:blur(8px)}
#intro .in-skip{position:absolute;right:calc(16px + env(safe-area-inset-right,0px));top:calc(14px + env(safe-area-inset-top,0px));background:rgba(255,255,255,.1);color:#cfe9ff;border:1px solid rgba(255,255,255,.25);
  border-radius:999px;padding:8px 16px;font:inherit;font-size:14px;cursor:pointer}
body.intro-on{overflow:hidden}
body.intro-reveal .wrap{animation:inApp .9s cubic-bezier(.2,.8,.2,1)}
@keyframes inApp{from{opacity:0;transform:scale(.97);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
`);

/* ================= 1) talking owl + captions ================= */
let talkN = 0, capForce = false, capTarget = null, pendingCap = null, capHideT = null, typeT = null;
const setTalking = on => { talkN = Math.max(0, talkN + (on ? 1 : -1)); document.body.classList.toggle('owl-talking', talkN > 0); };
const cap = document.createElement('div');
cap.id = 'owlCap'; cap.setAttribute('aria-live', 'polite');
cap.innerHTML = '<svg class="owl" data-owl viewBox="0 0 80 80" aria-hidden="true"></svg><div class="tx"></div>';
document.body.appendChild(cap);
const seg = (() => { try { const s = new Intl.Segmenter('th', { granularity: 'grapheme' }); return t => Array.from(s.segment(t), x => x.segment); } catch (e) { return t => Array.from(t); } })();

function readerOnly() {
  // inside the reader the words themselves light up, so plain word/spelling speech gets no caption
  if (!visible('vRead') && !visible('vClass')) return false;
  return !OVERLAYS.some(visible);
}
function wantCaption(text) {
  if (capForce) return true;
  const t = String(text || '').trim();
  return t.length >= 8 && /\s/.test(t) && !readerOnly();
}
function typeInto(el, text, seconds, prefix) {
  clearInterval(typeT);
  const g = seg(text), n = g.length;
  const step = Math.max(18, Math.min(90, (seconds * 1000 * 0.92) / Math.max(1, n)));
  let i = 0;
  const draw = () => { el.innerHTML = (prefix || '') + esc(g.slice(0, i).join('')) + (i < n ? '<span class="cur"></span>' : ''); };
  draw();
  typeT = setInterval(() => { i = Math.min(n, i + 1); draw(); if (i >= n) clearInterval(typeT); }, step);
}
function startCaption(seconds) {
  if (!pendingCap) return;
  const { text, target } = pendingCap; pendingCap = null;
  if (target) { typeInto(target, text, seconds); return; }
  clearTimeout(capHideT);
  if (!cap.classList.contains('show')) { renderOwls(); cap.classList.add('show'); }
  typeInto(cap.querySelector('.tx'), text, seconds, '<b>พี่ฮูก:</b>');
}
function endCaption(target) {
  if (target) { clearInterval(typeT); return; }
  clearTimeout(capHideT);
  capHideT = setTimeout(() => cap.classList.remove('show'), 1400);
}
const estSeconds = (text, rate) => Math.max(0.8, seg(text).length / (13 * (rate || 1) * (voicePref.rate || 1)));

const _playPcm = playPcm;
playPcm = function (pcm) { startCaption(pcm.length / HQ_RATE); return _playPcm(pcm); };
const _speakDevice = speakDevice;
speakDevice = function (text, rate) { startCaption(estSeconds(text, rate)); return _speakDevice(text, rate); };
const _speak = speak;
speak = async function (text, rate) {
  const withCap = wantCaption(text), target = capTarget;
  if (withCap) pendingCap = { text: String(text).trim(), target };
  setTalking(true);
  try { return await _speak(text, rate); }
  finally {
    setTalking(false);
    if (withCap) { if (pendingCap && pendingCap.text === String(text).trim()) pendingCap = null; else endCaption(target); }
  }
};
window.owlLine = async function (text, bubble) {
  capForce = true; capTarget = bubble || null;
  try { await speak(text, 1); } finally { capForce = false; capTarget = null; }
  if (bubble) bubble.textContent = text;
};
// stopping speech also stops the typing and hides the bar
const _stopSpeech = stopSpeech;
stopSpeech = function () { _stopSpeech(); pendingCap = null; clearInterval(typeT); cap.classList.remove('show'); };

/* ================= 2) background music ================= */
const Music = (() => {
  let on = lsGet('tsb-music', true), unlocked = false, out = null, bus = null, echo = null, verb = null;
  let timer = null, nextT = 0, step = 0, running = false, idleSince = 0, pattern = 0;
  const BPM = 74, E = 60 / BPM / 2;                      // eighth note
  // Cmaj9 – Am7 – Fmaj7 – G6sus: soft, game-lobby feel
  const PROG = [[48, [60, 64, 67, 71, 74]], [45, [57, 60, 64, 67, 72]], [41, [57, 60, 65, 69, 72]], [43, [59, 62, 67, 69, 74]]];
  const PATS = [[0, 2, 1, 3, 2, 4, 3, 2], [0, 1, 2, 4, -1, 3, 2, -1], [4, 3, 2, 1, 2, 3, -1, 0], [0, -1, 2, 3, 4, -1, 3, 1]];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function build(c) {
    out = c.createGain(); out.gain.value = 0; out.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(out);
    bus = c.createGain(); bus.gain.value = 0.9; bus.connect(comp);
    verb = c.createConvolver();
    const len = c.sampleRate * 2.8, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir; const vg = c.createGain(); vg.gain.value = 0.32; verb.connect(vg); vg.connect(comp);
    echo = c.createDelay(1); echo.delayTime.value = E * 3; const fb = c.createGain(); fb.gain.value = 0.32; const eg = c.createGain(); eg.gain.value = 0.22;
    echo.connect(fb); fb.connect(echo); echo.connect(eg); eg.connect(comp);
  }
  function pad(c, t, notes, dur) {
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.3;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 1.6); g.gain.setValueAtTime(0.05, t + dur - 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
    lp.connect(g); g.connect(bus); g.connect(verb);
    notes.slice(0, 4).forEach(m => [-6, 6].forEach(cents => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = cents; o.connect(lp); o.start(t); o.stop(t + dur + 1.6); }));
  }
  function pluck(c, t, m, vel) {
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.085 * vel, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1);
    g.connect(bus); g.connect(echo); g.connect(verb);
    [[1, 'sine', 1], [2.01, 'sine', 0.28], [3.98, 'sine', 0.07]].forEach(([mul, type, amp]) => {
      const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = hz(m) * mul; og.gain.value = amp; o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.2);
    });
  }
  function bass(c, t, m) {
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = hz(m - 12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + E * 3.6);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + E * 4);
  }
  function tick() {
    const c = actx; if (!c || !running) return;
    while (nextT < c.currentTime + 0.4) {
      const bar16 = step % 16, chord = PROG[Math.floor(step / 16) % PROG.length];
      if (bar16 === 0) { pad(c, nextT, chord[1], E * 16); if (Math.floor(step / 16) % 2 === 0) pattern = Math.floor(Math.random() * PATS.length); }
      if (bar16 % 4 === 0) bass(c, nextT, bar16 === 8 ? chord[0] + 7 : chord[0]);
      const k = PATS[pattern][step % 8];
      if (k >= 0 && Math.random() < 0.86) pluck(c, nextT + (Math.random() - 0.5) * 0.012, chord[1][k] + (bar16 >= 8 && k < 2 ? 12 : 0), bar16 % 4 === 0 ? 1 : 0.7);
      nextT += E; step++;
    }
  }
  function start() {
    const c = ctx(); if (!c) return;
    if (!out) build(c);
    if (!running) { running = true; nextT = c.currentTime + 0.15; step = step - (step % 16); clearInterval(timer); timer = setInterval(tick, 120); tick(); }
  }
  function stop() { running = false; clearInterval(timer); timer = null; }
  function update() {
    const v = currentView();
    const menu = ['vLib', 'vCover', 'vMap', 'vMe', 'vLogin', 'vDash'].includes(v);
    const busy = (typeof listening !== 'undefined' && listening) || (typeof recState !== 'undefined' && recState.rec) ||
      ['voiceModal', 'recMe', 'finale', 'stageWin', 'rtCheer', 'pinGate'].some(visible) || document.body.classList.contains('intro-on');
    const want = on && unlocked && menu && !busy && !document.hidden;
    btn.hidden = !menu || document.body.classList.contains('intro-on');
    btn.classList.toggle('on', on);
    if (want) start();
    if (!out) return;
    const talking = talkN > 0 || hqPlaying || (window.speechSynthesis && speechSynthesis.speaking);
    const level = want ? (talking ? 0.16 : 0.55) : 0;
    out.gain.setTargetAtTime(level, actx.currentTime, want ? 0.6 : 0.25);
    if (!want) { if (!idleSince) idleSince = Date.now(); else if (running && Date.now() - idleSince > 3000) stop(); }
    else idleSince = 0;
  }
  const btn = document.createElement('button');
  btn.id = 'bgmBtn'; btn.type = 'button'; btn.title = 'เปิด/ปิดเพลงพื้นหลัง'; btn.setAttribute('aria-label', 'เปิดหรือปิดเพลงพื้นหลัง'); btn.hidden = true;
  btn.innerHTML = '<span class="bars"><i></i><i></i><i></i></span>';
  btn.onclick = e => { e.stopPropagation(); on = !on; lsSet('tsb-music', on); unlocked = true; update(); toast(on ? 'เปิดเพลงพื้นหลังแล้ว' : 'ปิดเพลงพื้นหลังแล้ว'); };
  document.body.appendChild(btn);
  const unlock = () => { if (document.body.classList.contains('intro-on')) return; unlocked = true; ctx(); update(); };
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true }));
  document.addEventListener('visibilitychange', update);
  document.addEventListener('tsb:view', () => setTimeout(update, 50));
  setInterval(update, 350);
  return { update, unlockNow() { unlocked = true; update(); }, get on() { return on; }, get running() { return running; } };
})();
window.tsbMusic = Music;

/* ================= 3) intro: district logo → futuristic dissolve → app ================= */
function introSound() {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + 0.05, sr = c.sampleRate;
  const master = c.createGain(); master.gain.value = 0.85; master.connect(c.destination);
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
  const verb = c.createConvolver(), irLen = sr * 3.5, ir = c.createBuffer(2, irLen, sr);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.2); }
  verb.buffer = ir; const vg = c.createGain(); vg.gain.value = 0.5; verb.connect(vg); vg.connect(comp);
  const noise = (() => { const b = c.createBuffer(1, sr * 3, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const noiseHit = (at, dur, type, f0, f1, peak, q = 1) => {
    const s = c.createBufferSource(); s.buffer = noise; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, at); f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.25);
    s.connect(f); f.connect(g); g.connect(comp); g.connect(verb); s.start(at); s.stop(at + dur + 0.3);
  };
  // 1) riser into the hit
  noiseHit(t, 1.4, 'bandpass', 220, 6500, 0.35, 2.2);
  [0, 7, 12].forEach((iv, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(48 + iv), t); o.frequency.exponentialRampToValueAtTime(hz(60 + iv), t + 1.4);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + 1.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 1.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(f); f.connect(g); g.connect(comp); o.start(t); o.stop(t + 1.55); });
  // 2) impact: sub drop + crash
  const hit = t + 1.45;
  { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(110, hit); o.frequency.exponentialRampToValueAtTime(32, hit + 0.9);
    g.gain.setValueAtTime(0.9, hit); g.gain.exponentialRampToValueAtTime(0.001, hit + 1.6); o.connect(g); g.connect(comp); o.start(hit); o.stop(hit + 1.7); }
  { const s = c.createBufferSource(); s.buffer = noise; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
    const g = c.createGain(); g.gain.setValueAtTime(0.4, hit); g.gain.exponentialRampToValueAtTime(0.001, hit + 2.2); s.connect(f); f.connect(g); g.connect(comp); g.connect(verb); s.start(hit); s.stop(hit + 2.3); }
  // 3) big warm chord swell (C major add9)
  [36, 48, 55, 60, 64, 67, 72, 74, 76].forEach((m, i) => [-8, 8].forEach(cents => {
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = i < 2 ? 'triangle' : 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents;
    f.type = 'lowpass'; f.frequency.setValueAtTime(500, hit); f.frequency.exponentialRampToValueAtTime(3800, hit + 0.8); f.frequency.exponentialRampToValueAtTime(900, hit + 3.6);
    g.gain.setValueAtTime(0.0001, hit); g.gain.exponentialRampToValueAtTime(i < 2 ? 0.08 : 0.024, hit + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, hit + 4.2);
    o.connect(f); f.connect(g); g.connect(comp); g.connect(verb); o.start(hit); o.stop(hit + 4.3);
  }));
  // 4) shimmering bells
  const bells = (at, notes, gap, amp) => notes.forEach((m, i) => { const tt = at + i * gap; [1, 2.76].forEach((mul, j) => {
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = hz(m) * mul;
    g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(j ? amp * 0.25 : amp, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 1.8);
    o.connect(g); g.connect(comp); g.connect(verb); o.start(tt); o.stop(tt + 1.9); }); });
  bells(hit + 0.1, [84, 88, 91, 96, 100], 0.085, 0.07);
  // 5) dissolve whoosh + sparkle tail
  noiseHit(t + 2.65, 1.3, 'bandpass', 5200, 500, 0.22, 1.4);
  bells(t + 2.8, [103, 100, 96, 91, 88, 84, 79], 0.11, 0.04);
}

function dissolve(img, canvas, dur) {
  return new Promise(res => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.width = canvas.clientWidth * dpr, H = canvas.height = canvas.clientHeight * dpr;
    const g = canvas.getContext('2d');
    const r = img.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    const ox = (r.left - cr.left) * dpr, oy = (r.top - cr.top) * dpr, w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    const off = document.createElement('canvas'); off.width = w; off.height = h;
    const og = off.getContext('2d');
    // object-fit: contain inside the box
    const ar = img.naturalWidth / img.naturalHeight || 1; let dw = w, dh = w / ar; if (dh > h) { dh = h; dw = h * ar; }
    og.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    let data; try { data = og.getImageData(0, 0, w, h).data; } catch (e) { data = null; }
    const P = [], stp = Math.max(3, Math.round(3 * dpr));
    if (data) for (let y = 0; y < h; y += stp) for (let x = 0; x < w; x += stp) {
      const i = (y * w + x) * 4; if (data[i + 3] < 120) continue;
      P.push({ x0: ox + x, y0: oy + y, c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`, th: (x / w) * 0.62 + Math.random() * 0.14,
        vx: (0.6 + Math.random() * 2.2) * dpr, vy: (-0.4 - Math.random() * 1.6) * dpr, ph: Math.random() * 6.28, s: stp * (0.6 + Math.random() * 0.6) });
    }
    const t0 = performance.now();
    const frame = now => {
      const t = (now - t0) / dur;
      g.clearRect(0, 0, W, H);
      // the part of the logo the beam has not reached yet
      const front = Math.max(0, Math.min(1, (t - 0.1) / 0.62)) * w;
      if (front < w) g.drawImage(off, front, 0, w - front, h, ox + front, oy, w - front, h);
      // scanning beam
      if (t < 0.85) {
        const bx = ox + Math.min(w, (t / 0.62) * w);
        const gr = g.createLinearGradient(bx - 40 * dpr, 0, bx + 12 * dpr, 0);
        gr.addColorStop(0, 'rgba(127,243,255,0)'); gr.addColorStop(0.8, 'rgba(127,243,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,.95)');
        g.fillStyle = gr; g.fillRect(bx - 40 * dpr, oy - 20 * dpr, 52 * dpr, h + 40 * dpr);
      }
      g.globalCompositeOperation = 'lighter';
      for (const p of P) {
        if (t < p.th) continue;
        const a = (t - p.th) * dur / 1000, life = 1 - a / 1.1; if (life <= 0) continue;
        const x = p.x0 + p.vx * a * 60 + Math.sin(p.ph + a * 6) * 6 * dpr * a, y = p.y0 + p.vy * a * 60 - a * a * 30 * dpr;
        g.globalAlpha = life; g.fillStyle = a < 0.12 ? '#bff8ff' : p.c;
        const s = p.s * (0.4 + life * 0.6); g.fillRect(x, y, s, s);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      if (t < 1.8) requestAnimationFrame(frame); else { g.clearRect(0, 0, W, H); res(); }
    };
    requestAnimationFrame(frame);
  });
}

function stars(canvas) {
  const g = canvas.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  let W, H, alive = true; const S = [];
  const fit = () => { W = canvas.width = canvas.clientWidth * dpr; H = canvas.height = canvas.clientHeight * dpr; };
  fit(); addEventListener('resize', fit);
  for (let i = 0; i < 110; i++) S.push({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, p: Math.random() * 6.28 });
  const draw = now => {
    if (!alive) return;
    g.clearRect(0, 0, W, H);
    for (const s of S) {
      s.y -= 0.00025 * s.z; if (s.y < 0) { s.y = 1; s.x = Math.random(); }
      const a = 0.35 + 0.65 * Math.abs(Math.sin(s.p + now / 900 * s.z));
      g.fillStyle = `rgba(160,220,255,${a * s.z})`; g.beginPath(); g.arc(s.x * W, s.y * H, (0.6 + s.z * 1.4) * dpr, 0, 6.28); g.fill();
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  return () => { alive = false; removeEventListener('resize', fit); };
}

function runIntro() {
  const q = new URLSearchParams(location.search);
  const force = q.get('intro') === '1';
  let seen = false; try { seen = sessionStorage.getItem('tsb-intro') === '1'; } catch (e) {}
  if (!force && (seen || navigator.webdriver || q.get('intro') === '0' || q.get('book'))) return;
  try { sessionStorage.setItem('tsb-intro', '1'); } catch (e) {}
  document.body.classList.add('intro-on');
  const el = document.createElement('div');
  el.id = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'ยินดีต้อนรับสู่นิทานพูดได้');
  el.innerHTML = `<canvas class="in-bg"></canvas><div class="in-grid"></div>
    <div class="in-stage">
      <div class="in-logo-wrap"><div class="in-ring"></div><div class="in-ring in-r2"></div><img class="in-logo" src="logo-aya2.png" alt="ตราสำนักงานเขตพื้นที่การศึกษาประถมศึกษาพระนครศรีอยุธยา เขต 2"><div class="in-shine"></div><div class="in-scan"></div></div>
      <div class="in-sub">สพป.พระนครศรีอยุธยา เขต 2 ภูมิใจนำเสนอ</div>
      <h1 class="in-title">นิทานพูดได้</h1>
      <div class="in-tap">✨ แตะเพื่อเข้าสู่โปรแกรม</div>
    </div>
    <canvas class="in-fx"></canvas>
    <button class="in-skip" type="button">ข้าม ›</button>`;
  document.body.appendChild(el);
  const stopStars = stars(el.querySelector('canvas.in-bg'));
  const img = el.querySelector('.in-logo');
  let started = false, finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    el.classList.add('in-out'); document.body.classList.add('intro-reveal');
    setTimeout(() => { stopStars(); el.remove(); document.body.classList.remove('intro-on', 'intro-reveal'); Music.unlockNow();
      document.dispatchEvent(new CustomEvent('tsb:introDone'));
      setTimeout(() => { if (!OVERLAYS.some(visible) && !visible('pinGate')) owlLine(ME ? 'ยินดีต้อนรับกลับมานะ ' + meName() + ' ไปอ่านนิทานกันเถอะ' : 'สวัสดีจ้ะ ยินดีต้อนรับสู่นิทานพูดได้ มาฝึกอ่านกับพี่ฮูกกันนะ'); }, 500);
    }, 750);
  };
  const go = async () => {
    if (started) return; started = true;
    introSound();
    el.classList.add('in-go');
    await sleep(1450);
    el.classList.add('in-boom');
    await sleep(1150);
    el.classList.add('in-dissolve');
    const p = img.complete && img.naturalWidth ? dissolve(img, el.querySelector('canvas.in-fx'), 1500) : sleep(600);
    await sleep(1500);
    finish();
    await p;
  };
  el.addEventListener('click', e => { if (e.target.closest('.in-skip')) { stopSpeech(); finish(); return; } go(); });
  document.addEventListener('keydown', function k(e) { if (finished) { document.removeEventListener('keydown', k); return; } if (e.key === 'Escape') finish(); else go(); });
}
runIntro();
})();
