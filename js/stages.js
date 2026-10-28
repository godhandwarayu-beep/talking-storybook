/* นิทานพูดได้ — book cover, stage map (each page is a stage to conquer), finale celebration,
   and sending each stage's result to the teacher. */
'use strict';

/* ---------- cover ---------- */
addSection('vCover', `
  <div class="rbar"><button class="btn ghost" id="cvBack">${ICON.back}ชั้นหนังสือ</button></div>
  <div class="cover-wrap">
    <div class="cover-art" id="cvArt"></div>
    <div class="cover-info">
      <span id="cvLevel"></span>
      <h2 id="cvTitle"></h2>
      <p class="login-sub" id="cvMeta"></p>
      <div class="cover-actions">
        <button class="btn primary big" id="cvStart">${ICON.play}<span>เริ่มผจญภัย</span></button>
        <button class="btn" id="cvRT">${ICON.test}ทดสอบแบบ RT</button>
        <button class="btn" id="cvClass">${ICON.screen}โหมดห้องเรียน (ฉายจอ)</button>
      </div>
    </div>
  </div>`);

/* ---------- stage map ---------- */
addSection('vMap', `
  <div class="rbar"><button class="btn ghost" id="mapBack">${ICON.back}ปกนิทาน</button><h2 id="mapTitle"></h2><span class="score" id="mapStars">★ 0</span></div>
  <div class="map-prog"><div class="meter"><i id="mapMeter"></i></div><span id="mapProgTxt"></span></div>
  <div class="stage-path" id="mapPath"></div>`);

/* ---------- stage passed / finale overlays ---------- */
addOverlay('stageWin', `<div class="big-modal"><div class="card win">
  <div class="win-stars" id="swStars"></div>
  <h3 id="swTitle">ผ่านด่านแล้ว!</h3>
  <p class="login-sub" id="swText"></p>
  <div class="prow" style="justify-content:center"><button class="btn" id="swMap">ดูแผนที่</button><button class="btn" id="swAgain">อ่านด่านนี้อีกครั้ง</button><button class="btn primary big" id="swNext">ด่านต่อไป</button></div>
</div></div>`);
addOverlay('finale', `<canvas id="fwCanvas"></canvas><div class="finale-card">
  <svg class="owl" data-owl viewBox="0 0 80 80" aria-hidden="true"></svg>
  <div class="fin-badge">พิชิตนิทานสำเร็จ!</div>
  <h2 id="finName"></h2>
  <p id="finText"></p>
  <div class="win-stars" id="finStars"></div>
  <p class="fin-date" id="finDate"></p>
  <div class="prow" style="justify-content:center"><button class="btn" id="finCheer">${ICON.play}ฟังคำชมอีกครั้ง</button><button class="btn" id="finAgain">อ่านอีกครั้ง</button><button class="btn primary" id="finHome">เลือกนิทานเรื่องใหม่</button></div>
</div>`);

addStyle(`
.cover-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:center}
@media (max-width:760px){.cover-wrap{grid-template-columns:1fr}}
.cover-art{position:relative;aspect-ratio:3/4;max-height:70vh;margin:0 auto;width:100%;border-radius:10px 26px 26px 10px;overflow:hidden;box-shadow:-10px 0 0 #c9d3df inset,0 30px 60px -24px rgba(19,35,58,.55);background:linear-gradient(140deg,var(--teal),#8b6cf0)}
.cover-art img{width:100%;height:100%;object-fit:cover}
.cover-art .ttl{position:absolute;inset:auto 0 0 0;padding:60px 22px 22px;background:linear-gradient(transparent,rgba(0,0,0,.65));color:#fff;font-size:clamp(26px,5vw,40px);font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.4);line-height:1.25}
.cover-info{display:grid;gap:10px}
.cover-info h2{margin:0;font-size:clamp(28px,4vw,40px);line-height:1.2}
.cover-info .lvl{position:static;display:inline-block;justify-self:start;border:1px solid var(--line)}
.cover-actions{display:grid;gap:10px;margin-top:8px;max-width:420px}
.btn.big{min-height:60px;font-size:20px}
.map-prog{display:flex;gap:12px;align-items:center;margin-bottom:10px}
.map-prog .meter{flex:1}
.map-prog span{font-weight:700;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.stage-path{position:relative;display:grid;gap:26px;padding:20px 0 40px;max-width:680px;margin:0 auto}
.stage-path::before{content:"";position:absolute;left:50%;top:30px;bottom:60px;width:10px;transform:translateX(-50%);border-radius:10px;background:repeating-linear-gradient(180deg,#d7dee8 0 18px,transparent 18px 30px)}
.stage{position:relative;display:flex;align-items:center;gap:16px;width:min(330px,82%);background:var(--card);border:1px solid var(--line);border-radius:26px;padding:10px 16px 10px 10px;box-shadow:var(--shadow);text-align:left;transition:transform .2s}
.stage:nth-child(odd){justify-self:start}
.stage:nth-child(even){justify-self:end;flex-direction:row-reverse;text-align:right;padding:10px 10px 10px 16px}
.stage .node{width:78px;height:78px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:30px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--teal),var(--teal-2));border:5px solid #fff;box-shadow:0 8px 18px -8px rgba(15,155,142,.8);overflow:hidden;position:relative}
.stage .node img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.stage .node b{position:relative;text-shadow:0 2px 6px rgba(0,0,0,.4)}
.stage .lbl{font-weight:700;font-size:17px}
.stage .stars{color:var(--sun);font-size:20px;letter-spacing:2px}
.stage.locked{opacity:.55}
.stage.locked .node{background:#c5cdd8;box-shadow:none}
.stage.locked .node svg{width:30px;height:30px;color:#fff;position:relative}
.stage.next{transform:scale(1.04)}
.stage.next .node{animation:pulseNode 1.4s ease-in-out infinite}
@keyframes pulseNode{50%{box-shadow:0 0 0 10px rgba(24,195,165,.25),0 8px 18px -8px rgba(15,155,142,.8)}}
.stage.done .node{background:linear-gradient(135deg,var(--sun),#ff8a3d)}
.stage.goal .node{background:linear-gradient(135deg,#8b6cf0,#ff7ab6);font-size:34px}
.win{background:linear-gradient(180deg,#fff9ea,#fff 40%)!important}
.win-stars{font-size:54px;letter-spacing:8px;color:var(--sun);text-shadow:0 4px 0 #e08a00}
.win-stars i{display:inline-block;font-style:normal;animation:starPop .5s cubic-bezier(.2,1.6,.4,1) both}
.win-stars i.off{color:#dfe5ee;text-shadow:none}
@keyframes starPop{from{transform:scale(0) rotate(-90deg)}}
#finale{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:16px;background:radial-gradient(circle at 50% 30%,#22406b,#0b1626)}
#finale[hidden]{display:none}
#fwCanvas{position:absolute;inset:0;width:100%;height:100%}
.finale-card{position:relative;z-index:2;background:rgba(255,255,255,.96);border-radius:32px;padding:26px 24px;width:min(560px,100%);text-align:center;display:grid;gap:8px;box-shadow:0 40px 90px -20px rgba(0,0,0,.7);animation:rise .5s ease-out}
.finale-card .owl{width:120px;height:132px;justify-self:center;animation:hop .7s ease-in-out infinite alternate}
.fin-badge{justify-self:center;background:linear-gradient(135deg,var(--sun),#ff8a3d);color:#2a1700;font-weight:800;border-radius:999px;padding:6px 18px;font-size:18px}
.finale-card h2{margin:0;font-size:clamp(30px,7vw,46px);color:var(--teal)}
.finale-card p{margin:0;font-size:18px}
.fin-date{color:var(--ink-faint);font-size:14px!important}
`);

let BK = null;          // the book being played as stages
let spotPlan = new Set();
function openBook(book) {
  BK = book; stopListening(); stopSpeech();
  show('vCover');
  const cv = book.cover || (book.pages[0] && book.pages[0].img);
  $('#cvArt').innerHTML = (cv ? `<img src="${cv}" alt="ปกนิทาน ${esc(book.title)}">` : '') + `<div class="ttl">${esc(book.title)}</div>`;
  $('#cvTitle').textContent = book.title;
  $('#cvLevel').outerHTML = '<span id="cvLevel">' + bookBadge(book) + '</span>';
  const p = bookProg(book.id), done = book.pages.filter((_, i) => p[i] > 0).length;
  $('#cvMeta').textContent = `${book.pages.length} ด่าน · ผ่านแล้ว ${done} ด่าน` + (ME ? ' · ผู้อ่าน: ' + meName() : '');
  $('#cvStart').querySelector('span').textContent = done ? (done === book.pages.length ? 'อ่านอีกครั้ง' : 'ผจญภัยต่อ') : 'เริ่มผจญภัย';
  // plan a voice spot check in this session: one random stage (two if the book is long)
  spotPlan = new Set();
  if (ME && ME.voice && !ME.voice.skipped && !teacher) {
    const n = book.pages.length;
    spotPlan.add(Math.floor(Math.random() * n));
    if (n >= 5) spotPlan.add(Math.floor(Math.random() * n));
  }
}
$('#cvBack').onclick = () => { show('vLib'); renderShelf(); };
$('#cvStart').onclick = () => openMap();
$('#cvRT').onclick = () => startRT(BK);
$('#cvClass').onclick = () => openClassMode(BK);

function stageUnlocked(i) { const p = bookProg(BK.id); return i === 0 || p[i - 1] > 0 || p[i] > 0 || teacher; }
function openMap() {
  show('vMap');
  const p = bookProg(BK.id), n = BK.pages.length;
  const done = BK.pages.filter((_, i) => p[i] > 0).length, stars = BK.pages.reduce((a, _, i) => a + (p[i] || 0), 0);
  $('#mapTitle').textContent = BK.title;
  $('#mapStars').textContent = '★ ' + stars + '/' + n * 3;
  $('#mapMeter').style.width = Math.round(done / n * 100) + '%';
  $('#mapProgTxt').textContent = `ผ่าน ${done}/${n} ด่าน`;
  const nextI = BK.pages.findIndex((_, i) => !(p[i] > 0));
  $('#mapPath').innerHTML = BK.pages.map((pg, i) => {
    const ok = p[i] > 0, open = stageUnlocked(i), isGoal = i === n - 1;
    const cls = ok ? 'done' : open ? (i === nextI ? 'next' : '') : 'locked';
    return `<button class="stage ${cls}${isGoal ? ' goal' : ''}" data-st="${i}" ${open ? '' : 'aria-disabled="true"'}>
      <span class="node">${pg.img ? `<img src="${pg.img}" alt="">` : ''}${open ? `<b>${isGoal ? '🏆' : i + 1}</b>` : ICON.lock}</span>
      <span><span class="lbl">${isGoal ? 'ด่านสุดท้าย' : 'ด่านที่ ' + (i + 1)}</span><br><span class="stars">${ok ? '★'.repeat(p[i]) + '☆'.repeat(3 - p[i]) : open ? 'พร้อมแล้ว!' : 'ยังไม่ปลดล็อก'}</span></span>
    </button>`;
  }).join('');
  const nx = $('#mapPath').querySelector('.stage.next');
  if (nx) setTimeout(() => nx.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
}
$('#mapBack').onclick = () => openBook(BK);
$('#mapPath').addEventListener('click', e => {
  const b = e.target.closest('[data-st]'); if (!b) return;
  const i = +b.dataset.st;
  if (!stageUnlocked(i)) { toast('ผ่านด่านก่อนหน้าก่อนนะ'); sndOops(); return; }
  playStage(i);
});

/* ---------- playing a stage ---------- */
let pendingCheck = null;       // spot-check result for the stage being played
async function playStage(i) {
  pendingCheck = null;
  if (spotPlan.has(i)) {
    spotPlan.delete(i);
    const words = tokenize(BK.pages[i].text).filter(t => t.readable && !isNumber(t.t)).map(t => t.t.replace(/[\/ๆ]/g, ''));
    const w = words.length ? words[Math.floor(Math.random() * words.length)] : 'สวัสดี';
    pendingCheck = await voiceSpotCheck(w);
  }
  if (!cur.book || cur.book.id !== BK.id || cur.mode !== 'stage') openReader(BK, i, 'stage');
  else loadPage(i);
}
// stage mode: prev/next only between stages already unlocked; back goes to the map
const _loadPage = loadPage;
loadPage = function (i) {
  _loadPage(i);
  if (cur.mode !== 'stage') return;
  const p = bookProg(BK.id), n = cur.book.pages.length;
  $('#btnPrev').disabled = cur.p === 0;
  $('#btnNext').disabled = cur.p >= n - 1 || !(p[cur.p] > 0);
  $('#rPager').textContent = cur.p === n - 1 ? 'ด่านสุดท้าย' : `ด่าน ${cur.p + 1} / ${n}`;
  cur.stats[cur.p].startAt = 0;
};
const _leave = leaveReader;
$('#btnBack').onclick = () => {
  if (cur.mode === 'stage') { keepAwake(false); stopListening(); stopReadAlong(); stopSpeech(); closeHelp(); cur.book = null; openMap(); }
  else if (cur.mode && cur.mode !== 'free' && window.leaveSpecialMode) leaveSpecialMode();
  else _leave();
};

/* what happened on the page, for the teacher and the word bank */
function pageReport() {
  const st = cur.stats[cur.p], idx = cur.tokens.map((t, i) => t.readable ? i : -1).filter(i => i >= 0);
  const count = s => idx.filter(i => cur.status[i] === s).length;
  const hard = [...new Set(idx.filter(i => /okHelp|okSkip/.test(cur.status[i]) || cur.wrongN[i] > 0).map(i => cur.tokens[i].t.replace(/[\/ๆ]/g, '')))];
  const seconds = st.startAt && st.endAt ? Math.max(1, Math.round((st.endAt - st.startAt) / 1000)) : 0;
  const read = count('ok') + count('okHelp');
  return { words: idx.length, correct: count('ok'), helped: count('okHelp'), skipped: count('okSkip'), wrongs: st.wrongs, seconds,
           wpm: seconds >= 3 ? Math.min(250, Math.round(read / (seconds / 60))) : 0,  /* too short to measure → not counted */ stars: starsFor(st), score: (cur.pageScore && cur.pageScore[cur.p]) || 0, hardWords: hard };
}
const _pageComplete = pageComplete;
pageComplete = function () {
  _pageComplete();
  if (cur.mode === 'stage') return stageComplete();
  if (window.specialPageComplete) specialPageComplete();
};
function stageComplete() {
  const i = cur.p, n = cur.book.pages.length, rep = pageReport();
  saveStage(BK.id, i, rep.stars);
  if (rep.hardWords.length) noteHardWords(rep.hardWords);
  const chk = pendingCheck; pendingCheck = null;
  saveLog(Object.assign({ mode: 'story', title: BK.title, bookId: BK.id, stage: i, voiceFlag: chk ? chk.verdict : '' }, rep), chk && chk.clip, chk && chk.mime);
  $('#doneBanner').hidden = true;
  setTimeout(() => {
    if (i === n - 1) return finale();
    const s = rep.stars;
    $('#swStars').innerHTML = [0, 1, 2].map(k => `<i class="${k < s ? '' : 'off'}" style="animation-delay:${k * 0.18}s">★</i>`).join('');
    $('#swTitle').textContent = 'ผ่านด่านที่ ' + (i + 1) + ' แล้ว!';
    $('#swText').textContent = s === 3 ? 'อ่านถูกทุกคำ เก่งมาก! ด่านต่อไปปลดล็อกแล้ว' : 'ด่านต่อไปปลดล็อกแล้ว ไปต่อกันเลย';
    $('#swNext').textContent = i + 1 === n - 1 ? 'ไปด่านสุดท้าย' : 'ด่านต่อไป';
    $('#stageWin').hidden = false;
  }, 900);
}
$('#swNext').onclick = () => { $('#stageWin').hidden = true; playStage(cur.p + 1); };
$('#swMap').onclick = () => { $('#stageWin').hidden = true; stopListening(); cur.book = null; openMap(); };
$('#swAgain').onclick = () => { $('#stageWin').hidden = true; $('#btnRestart').dataset.confirm = '1'; $('#btnRestart').click(); };
$('#btnDoneNext').onclick = () => { if (cur.mode === 'stage') { if (cur.p < cur.book.pages.length - 1) playStage(cur.p + 1); else finale(); } else if (cur.p === cur.book.pages.length - 1) showSummary(); else loadPage(cur.p + 1); };

/* ---------- finale: fireworks, applause and praise loud enough for everyone nearby ---------- */
let stopFw = null;
async function finale() {
  stopListening(); keepAwake(true);
  const p = bookProg(BK.id), stars = BK.pages.reduce((a, _, i) => a + (p[i] || 0), 0), max = BK.pages.length * 3;
  const name = ME ? meName() : 'หนู';
  $('#finName').textContent = ME ? 'เก่งมาก ' + name + '!' : 'เก่งมากเลย!';
  $('#finText').textContent = 'อ่านนิทานเรื่อง "' + BK.title + '" จบครบ ' + BK.pages.length + ' ด่าน';
  const n3 = Math.max(1, Math.round(stars / max * 3));
  $('#finStars').innerHTML = [0, 1, 2].map(k => `<i class="${k < n3 ? '' : 'off'}" style="animation-delay:${0.4 + k * 0.25}s">★</i>`).join('');
  $('#finDate').textContent = 'ได้ดาว ' + stars + ' จาก ' + max + ' ดวง · ' + new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
  $('#finale').hidden = false; renderOwls();
  stopFw && stopFw(); stopFw = fireworks($('#fwCanvas'), 8);
  saveLog({ mode: 'finish', title: BK.title, bookId: BK.id, stars, words: 0 });
  fanfare();
  setTimeout(() => applause(5), 1300);
  setTimeout(cheer, 2600);
}
async function cheer() {
  const name = ME ? meName() : '';
  const lines = [
    'เย้! เก่งมากเลย' + (name ? ' ' + name : ''),
    'อ่านนิทานเรื่อง ' + BK.title + ' จบแล้ว',
    'ทุกคน ปรบมือให้' + (name ? ' ' + name : 'หนู') + ' ดัง ๆ เลย!'
  ];
  for (const l of lines) { await speak(l, 1); await sleep(250); }
  applause(3);
}
$('#finCheer').onclick = () => { fanfare(); setTimeout(cheer, 900); stopFw && stopFw(); stopFw = fireworks($('#fwCanvas'), 5); };
$('#finAgain').onclick = () => { $('#finale').hidden = true; stopFw && stopFw(); stopSpeech(); cur.book = null; openMap(); };
$('#finHome').onclick = () => { $('#finale').hidden = true; stopFw && stopFw(); stopSpeech(); keepAwake(false); cur.book = null; show('vLib'); renderShelf(); };

/* ---------- editor: cover image + comprehension questions ---------- */
(function editorExtras() {
  const head = $('.ed-head');
  const box = document.createElement('div');
  box.className = 'ed-cover';
  box.innerHTML = `<div class="ph" id="edCoverPh">ยังไม่มีปก</div>
    <div class="pmain"><b>ปกนิทาน</b><p class="login-sub">ภาพปกจะแสดงที่ชั้นหนังสือและหน้าแรกของนิทาน ส่วนแต่ละหน้าด้านล่างคือ "ด่าน" ที่เด็กต้องพิชิตทีละด่าน</p>
    <div class="prow"><button class="btn" id="edCoverBtn">ใส่ภาพปก</button><button class="btn ghost" id="edCoverFirst">ใช้ภาพหน้าแรก</button><button class="btn ghost" id="edCoverDel">ลบปก</button><input type="file" id="edCoverIn" accept="image/*" hidden></div>
    <div id="edLevel" class="ocrst"></div></div>`;
  head.appendChild(box);
  const q = document.createElement('div');
  q.className = 'panel'; q.style.marginTop = '18px';
  q.innerHTML = `<h4>คำถามอ่านรู้เรื่อง (ใช้ในแบบทดสอบ RT)</h4><p>บรรทัดละ 1 ข้อ: คำถาม | ตัวเลือก | ตัวเลือก | ตัวเลือก ใส่ * หน้าคำตอบที่ถูก เว้นว่างไว้ ระบบจะสร้างคำถามเติมคำให้อัตโนมัติ</p>
    <textarea id="edQuestions" rows="4" placeholder="ช้างน้อยตัวสีอะไร | *ฟ้า | เขียว | แดง"></textarea>`;
  $('#edPages').after(q);
  addStyle(`.ed-cover{display:grid;grid-template-columns:150px minmax(0,1fr);gap:16px;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px;box-shadow:var(--shadow-sm)}
    .ed-cover .ph{aspect-ratio:3/4;border-radius:8px 16px 16px 8px;background:#f1f4f8;border:1.5px dashed rgba(19,35,58,.15);display:grid;place-items:center;overflow:hidden;color:var(--ink-faint);font-size:13px}
    .ed-cover .ph img{width:100%;height:100%;object-fit:cover}
    @media (max-width:520px){.ed-cover{grid-template-columns:100px minmax(0,1fr)}}`);
  const paint = () => {
    $('#edCoverPh').innerHTML = draft.cover ? `<img src="${draft.cover}" alt="">` : 'ยังไม่มีปก';
    const tmp = { id: 'x', updated: Date.now(), pages: draft.pages.filter(p => p.text.trim()) };
    if (tmp.pages.length) { const l = analyzeBook(tmp); $('#edLevel').innerHTML = `ระดับความยาก: <b>${l.level} (เหมาะ ${l.grade})</b> · ${l.words} คำ ${l.unique} คำไม่ซ้ำ · ควบกล้ำ ${l.cluster} · อักษรนำ ${l.lead} · ห/อ นำ ${l.hlead} · การันต์ ${l.karan} · อ่านไม่ตรงรูป ${l.irregular}`; }
    else $('#edLevel').textContent = '';
  };
  const qToText = qs => (qs || []).map(x => [x.q, ...x.choices.map((c, k) => (k === x.answer ? '*' : '') + c)].join(' | ')).join('\n');
  const textToQ = t => t.split('\n').map(l => l.split('|').map(s => s.trim()).filter(Boolean)).filter(a => a.length >= 3).map(a => { const ch = a.slice(1); let ans = ch.findIndex(c => c.startsWith('*')); if (ans < 0) ans = 0; return { q: a[0], choices: ch.map(c => c.replace(/^\*/, '').trim()), answer: ans }; });
  document.addEventListener('tsb:editorOpen', () => { $('#edQuestions').value = qToText(draft.questions); paint(); });
  document.addEventListener('tsb:collectDraft', () => { draft.questions = textToQ($('#edQuestions').value); });
  $('#edPages').addEventListener('input', () => { clearTimeout(paint._t); paint._t = setTimeout(paint, 500); });
  $('#edCoverBtn').onclick = () => $('#edCoverIn').click();
  $('#edCoverIn').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { draft.cover = await compressImage(f); paint(); } catch (err) { toast('เปิดภาพนี้ไม่ได้'); } };
  $('#edCoverFirst').onclick = () => { const p = draft.pages.find(x => x.img); if (!p) { toast('ยังไม่มีภาพในหน้าใดเลย'); return; } draft.cover = p.img; paint(); };
  $('#edCoverDel').onclick = () => { draft.cover = ''; paint(); };
})();
