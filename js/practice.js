/* นิทานพูดได้ — practice modes: hard-word review, RT-style test, record-and-compare, classroom projector mode */
'use strict';

/* tests run without help: no spelling card, no automatic spelling */
const isTest = () => /^rt/.test(cur.mode || '');
const _openHelp = openHelp;
openHelp = function (i, msg) { if (isTest()) return; _openHelp(i, msg); };

let special = null;     // {kind, onPage, onExit, ...}
window.leaveSpecialMode = function () {
  const sp = special; special = null;
  keepAwake(false); stopListening(); stopReadAlong(); stopSpeech(); closeHelp(); cur.book = null;
  if (sp && sp.onExit) sp.onExit(); else { show('vLib'); renderShelf(); }
};
window.specialPageComplete = function () { if (special && special.onPage) special.onPage(); };

/* ---------- result overlay used by practice and RT ---------- */
addOverlay('resultBox', `<div class="big-modal"><div class="card">
  <svg class="owl" data-owl viewBox="0 0 80 80" style="width:90px;height:100px;justify-self:center" aria-hidden="true"></svg>
  <h3 id="rbTitle"></h3><div id="rbBody"></div>
  <div class="prow" style="justify-content:center" id="rbBtns"></div>
</div></div>`);
addStyle(`
.rt-parts{display:grid;gap:10px;text-align:left}
.rt-part{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#f6f8fb;border-radius:16px;padding:12px 16px}
.rt-part b{font-size:22px;font-variant-numeric:tabular-nums;color:var(--teal)}
.rt-timer{font-variant-numeric:tabular-nums;font-weight:800;color:var(--coral)}
`);
function showResult(title, html, buttons) {
  $('#rbTitle').textContent = title; $('#rbBody').innerHTML = html;
  $('#rbBtns').innerHTML = '';
  buttons.forEach(([label, fn, primary]) => { const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = () => { $('#resultBox').hidden = true; fn(); }; $('#rbBtns').appendChild(b); });
  $('#resultBox').hidden = false; renderOwls();
}
const statusOfWord = () => { const i = cur.tokens.findIndex(t => t.readable); return i < 0 ? 'ok' : cur.status[i]; };

/* ---------- 1) hard-word review (spaced repetition) ---------- */
window.startPractice = function () {
  const words = dueWords(10);
  if (!words.length) { toast('วันนี้ยังไม่มีคำที่ต้องฝึก เก่งมาก!'); return; }
  const book = { id: '__practice', title: 'ฝึกคำยาก', spell: '', pages: words.map(w => ({ img: '', text: w })) };
  const learned = [], still = [];
  special = {
    kind: 'practice',
    onPage() {
      const w = words[cur.p], ok = statusOfWord() === 'ok';
      reviewWord(w, ok); (ok ? learned : still).push(w);
      $('#doneBanner').hidden = true;
      setTimeout(() => {
        if (cur.p < words.length - 1) { loadPage(cur.p + 1); tutorSay('คำต่อไป อ่านเลย'); }
        else {
          saveLog({ mode: 'practice', title: 'ฝึกคำยาก', words: words.length, correct: learned.length, helped: still.length, learnedWords: learned, hardWords: still });
          showResult('ฝึกคำยากเสร็จแล้ว!', `<p>อ่านได้เองทันที ${learned.length} จาก ${words.length} คำ</p>${still.length ? `<p class="login-sub">คำที่จะกลับมาฝึกอีก: ${still.map(esc).join(' · ')}</p>` : '<p>เก่งมาก ไม่มีคำที่ต้องฝึกซ้ำ!</p>'}`,
            [['กลับ', () => leaveSpecialMode(), true]]);
          magicSound(true); confetti();
        }
      }, 700);
    },
    onExit() { if (ME) openMe(); else { show('vLib'); renderShelf(); } }
  };
  openReader(book, 0, 'practice');
  $('#rTitle').textContent = 'ฝึกคำยาก (' + words.length + ' คำ)';
  tutorSay('มาฝึกคำที่เคยสะดุดกันนะ อ่านทีละคำเลย');
};

/* ---------- RT cheering: after each part, and a grand finale after all three ---------- */
addOverlay('rtCheer', `<div class="big-modal"><div class="card cheer-card">
  <svg class="owl cheer-owl" data-owl viewBox="0 0 80 80" aria-hidden="true"></svg>
  <div class="win-stars" id="chStars"></div>
  <h3 id="chTitle"></h3><p class="login-sub" id="chText"></p>
  <div class="prow" style="justify-content:center"><button class="btn primary big" id="chNext"></button></div>
</div></div>`);
addOverlay('rtFw', `<canvas id="rtFwCanvas"></canvas>`);
addStyle(`
.cheer-card{background:linear-gradient(180deg,#eafaf5,#fff 45%)!important}
.cheer-owl{width:120px;height:132px;justify-self:center;animation:hop .6s ease-in-out infinite alternate}
#rtFw{position:fixed;inset:0;z-index:60;pointer-events:none}
#rtFwCanvas{width:100%;height:100%}
.blank{display:inline-block;min-width:3.2em;border-bottom:4px dashed var(--sun-deep);margin:0 .2em;vertical-align:baseline}
`);
const kidName = () => (ME ? meName() : '');
async function owlSay(lines, bubble) { const my = speakToken; for (const l of lines) { if (my !== speakToken) return; await owlLine(l, bubble); await sleep(200); } }
function rtCheer(part, title, text, nextLabel, next) {
  stopListening(); stopSpeech();
  $('#chStars').innerHTML = [0, 1, 2].map(k => `<i style="animation-delay:${k * 0.15}s">★</i>`).join('');
  $('#chTitle').textContent = title; $('#chText').textContent = text;
  $('#chNext').textContent = nextLabel;
  $('#chNext').onclick = () => { stopSpeech(); $('#rtCheer').hidden = true; next(); };
  $('#rtCheer').hidden = false; renderOwls();
  magicSound(true); setTimeout(() => applause(3), 500);
  const n = kidName();
  setTimeout(() => owlSay(['เย้! ดีใจด้วยนะ' + (n ? ' ' + n : ''), 'ผ่านตอนที่ ' + part + ' แล้ว เก่งมากเลย']), 900);
}
let stopRtFw = null;
function rtFinale() {
  $('#rtFw').hidden = false;
  stopRtFw && stopRtFw(); stopRtFw = fireworks($('#rtFwCanvas'), 8);
  setTimeout(() => { $('#rtFw').hidden = true; }, 11000);
  fanfare(); setTimeout(boom, 300); setTimeout(() => applause(5), 1300);
  const n = kidName();
  setTimeout(() => owlSay(['เย้! ยินดีด้วยนะ' + (n ? ' ' + n : ''), 'ทำแบบทดสอบการอ่านครบทั้ง 3 ตอนแล้ว', 'เก่งมากเลย ทุกคนปรบมือให้' + (n ? ' ' + n : 'หนู') + ' ดัง ๆ เลย!']).then(() => applause(3)), 2400);
}

/* ---------- RT intro: พี่ฮูกยืนข้างการ์ด อธิบายทีละตอน ---------- */
addOverlay('rtIntro', `<div class="big-modal"><div class="card rti-card">
  <div class="rti-owl"><svg class="owl" data-owl viewBox="0 0 80 80" aria-hidden="true"></svg></div>
  <div class="rti-main">
    <div class="rti-bubble" id="rtiBubble" aria-live="polite"></div>
    <h3 class="rti-title">แบบทดสอบการอ่าน</h3>
    <div class="rti-parts" id="rtiParts"></div>
    <div class="rti-btns"><button class="btn" id="rtiCancel">ยกเลิก</button><button class="btn" id="rtiAgain">🔁 ฟังพี่ฮูกอีกครั้ง</button><button class="btn primary" id="rtiGo">เริ่มทดสอบ ▶</button></div>
  </div></div></div>`);
addStyle(`
#rtIntro .rti-card{max-width:760px;text-align:left;display:grid;grid-template-columns:150px 1fr;gap:6px 18px;align-items:start;position:relative;overflow:visible}
.rti-owl{position:sticky;top:0;display:flex;justify-content:center;padding-top:18px}
.rti-owl svg{width:150px;height:170px;filter:drop-shadow(0 10px 18px rgba(43,35,80,.25));animation:rtiFloat 3s ease-in-out infinite}
@keyframes rtiFloat{50%{transform:translateY(-6px)}}
.rti-bubble{position:relative;background:#fff;border:3px solid var(--ink,#2b2350);border-radius:20px;padding:12px 16px;min-height:3.6em;font-size:clamp(17px,2.6vw,21px);line-height:1.55;color:var(--ink,#2b2350);box-shadow:0 6px 0 rgba(43,35,80,.12)}
.rti-bubble::before{content:"";position:absolute;left:-15px;top:22px;border:12px solid transparent;border-right-color:var(--ink,#2b2350);border-left:0}
.rti-bubble::after{content:"";position:absolute;left:-10px;top:24px;border:10px solid transparent;border-right-color:#fff;border-left:0}
.rti-bubble .cur{display:inline-block;width:.5em;height:1em;vertical-align:-.12em;background:currentColor;opacity:.5;margin-left:2px;animation:capBlink .7s steps(2) infinite}
.rti-title{margin:14px 0 8px;font-size:clamp(20px,3vw,26px)}
.rti-parts{display:grid;gap:8px}
.rti-part{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 14px;border-radius:16px;background:#f4f0ff;border:2px solid transparent;transition:transform .35s,background .35s,border-color .35s,box-shadow .35s}
.rti-part .no{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#8c6bd6;color:#fff;font-weight:800}
.rti-part b{font-size:15px;color:#6b5aa6;white-space:nowrap}
.rti-part.on{background:#fff7dc;border-color:#ffb627;transform:scale(1.03);box-shadow:0 8px 18px rgba(255,182,39,.28)}
.rti-part.on .no{background:#ffb627;color:#2b2350;animation:micBob 1s ease-in-out infinite}
.rti-part.done .no::after{content:"✓"}.rti-part.done .no span{display:none}
.rti-btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:14px}
#rtiGo.ready{animation:rtiGo 1.1s ease-in-out infinite;box-shadow:0 0 0 0 rgba(24,195,165,.6)}
@keyframes rtiGo{50%{transform:scale(1.07);box-shadow:0 0 0 12px rgba(24,195,165,0)}}
@media (max-width:640px){#rtIntro .rti-card{display:block;padding:18px}.rti-owl{float:left;position:static;width:88px;padding-top:4px}.rti-owl svg{width:88px;height:100px}.rti-bubble{margin-left:100px;font-size:16px}.rti-title{clear:both;padding-top:6px}.rti-part{padding:9px 12px}.rti-btns{justify-content:stretch}.rti-btns .btn{flex:1 1 auto}}
`);
function openRTIntro({ words, quiz, onStart, onCancel }) {
  const n = kidName();
  const parts = [
    ['ตอนที่ 1 อ่านออกเสียง', words + ' ข้อ'],
    ['ตอนที่ 2 อ่านข้อความ', '1 เรื่อง'],
    ['ตอนที่ 3 จงเติมคำให้สมบูรณ์มีความหมาย', (quiz || 0) + ' ข้อ']
  ];
  const script = [
    [-1, 'สวัสดีจ้ะ' + (n ? ' ' + n : '') + ' วันนี้พี่ฮูกจะพาทำแบบทดสอบการอ่าน มีทั้งหมด 3 ตอนนะ'],
    [0, 'ตอนที่ 1 อ่านออกเสียง จะมีให้อ่านทีละคำ อ่านให้ชัด ๆ ถ้าคำไหนอ่านไม่ได้ กดข้ามคำได้เลยจ้ะ'],
    [1, 'ตอนที่ 2 อ่านข้อความ ค่อย ๆ อ่านไปทีละคำจนจบเรื่อง ไม่ต้องรีบนะ'],
    [2, 'ตอนที่ 3 จงเติมคำให้สมบูรณ์มีความหมาย อ่านประโยค แล้วเลือกคำที่ถูกต้องมาเติมในช่องว่าง'],
    [3, 'ระหว่างทดสอบ พี่ฮูกจะไม่ช่วยสะกดนะ ตั้งใจเต็มที่ พี่ฮูกเป็นกำลังใจให้'],
    [4, 'เมื่อพร้อมแล้ว กดเริ่มทดสอบ แล้วไปกันเลย!']
  ];
  if (!quiz) { parts.pop(); script.splice(3, 1); }
  $('#rtiParts').innerHTML = parts.map((p, i) => `<div class="rti-part" data-pt="${i}"><span class="no"><span>${i + 1}</span></span><span>${esc(p[0])}</span><b>${esc(p[1])}</b></div>`).join('');
  const go = $('#rtiGo'), bubble = $('#rtiBubble');
  const mark = k => document.querySelectorAll('#rtiParts .rti-part').forEach((el, i) => { el.classList.toggle('on', i === k); if (k >= 0 && i < k || k >= 3) el.classList.add('done'); });
  let run = 0;
  const explain = async () => {
    const me = ++run; stopSpeech(); go.classList.remove('ready');
    document.querySelectorAll('#rtiParts .rti-part').forEach(el => el.classList.remove('on', 'done'));
    for (const [k, line] of script) {
      if (me !== run || $('#rtIntro').hidden) return;
      mark(k); if (k === 4) go.classList.add('ready');
      await owlSay([line], bubble);
      await sleep(250);
    }
    if (me === run) { mark(-1); go.classList.add('ready'); }
  };
  const close = () => { run++; stopSpeech(); $('#rtIntro').hidden = true; };
  $('#rtiCancel').onclick = () => { close(); onCancel(); };
  $('#rtiAgain').onclick = explain;
  go.onclick = () => { close(); onStart(); };
  bubble.textContent = '';
  $('#rtIntro').hidden = false; renderOwls();
  setTimeout(explain, 350);
}

/* ---------- 2) RT-style test: words · timed passage · comprehension ---------- */
window.startRT = function (book) {
  if (!book) return;
  const pool = [...new Set(book.pages.flatMap(p => tokenize(p.text).filter(t => t.readable).map(t => t.t.replace(/[\/]/g, ''))))];
  const words = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(20, pool.length));
  const passagePage = book.pages.slice().sort((a, b) => tokenize(b.text).filter(t => t.readable).length - tokenize(a.text).filter(t => t.readable).length)[0];
  const R = { book, words: { total: words.length, ok: 0, missed: [] }, passage: { words: 0, ok: 0, seconds: 0, wcpm: 0 }, quiz: { total: 0, ok: 0 }, t0: 0 };
  const nQuiz = Math.min(5, (book.questions && book.questions.length ? book.questions : autoQuestions(book)).length);
  const intro = () => openRTIntro({ words: words.length, quiz: nQuiz, onStart: part1, onCancel: () => openBook(book) });
  function part1() {
    const pseudo = { id: '__rt', title: book.title, spell: book.spell, pages: words.map(w => ({ img: '', text: w })) };
    R.t0 = Date.now();
    special = {
      kind: 'rt-words',
      onPage() {
        const ok = statusOfWord() === 'ok'; if (ok) R.words.ok++; else R.words.missed.push(words[cur.p]);
        $('#doneBanner').hidden = true;
        setTimeout(() => { if (cur.p < words.length - 1) loadPage(cur.p + 1); else rtCheer(1, 'ผ่านตอนที่ 1 แล้ว!', 'อ่านออกเสียงได้ ' + R.words.ok + ' จาก ' + R.words.total + ' คำ', 'ไปตอนที่ 2', part2); }, 450);
      },
      onExit() { openBook(book); }
    };
    openReader(pseudo, 0, 'rt-words');
    $('#rTitle').textContent = 'ทดสอบ ตอนที่ 1: อ่านออกเสียง';
    tutorSay('ตอนที่ 1 อ่านออกเสียงทีละคำ อ่านไม่ได้กดข้ามคำได้นะ');
  }
  function part2() {
    const pseudo = { id: '__rt2', title: book.title, spell: book.spell, pages: [{ img: passagePage.img, text: passagePage.text }] };
    special = {
      kind: 'rt-passage',
      onPage() {
        const st = cur.stats[0], idx = cur.tokens.map((t, i) => t.readable ? i : -1).filter(i => i >= 0);
        R.passage.words = idx.length; R.passage.ok = idx.filter(i => cur.status[i] === 'ok').length;
        R.passage.seconds = st.startAt && st.endAt ? Math.max(1, Math.round((st.endAt - st.startAt) / 1000)) : 0;
        R.passage.wcpm = R.passage.seconds >= 3 ? Math.min(250, Math.round(R.passage.ok / (R.passage.seconds / 60))) : 0;
        $('#doneBanner').hidden = true;
        setTimeout(() => { stopListening(); cur.book = null; rtCheer(2, 'ผ่านตอนที่ 2 แล้ว!', 'อ่านข้อความถูก ' + R.passage.ok + ' จาก ' + R.passage.words + ' คำ' + (R.passage.wcpm ? ' · ' + R.passage.wcpm + ' คำต่อนาที' : ''), 'ไปตอนที่ 3', part3); }, 700);
      },
      onExit() { openBook(book); }
    };
    openReader(pseudo, 0, 'rt-passage');
    $('#rTitle').textContent = 'ทดสอบ ตอนที่ 2: อ่านข้อความ';
    tutorSay('ตอนที่ 2 กดไมค์ แล้วค่อย ๆ อ่านข้อความนี้ให้จบนะ ไม่ต้องรีบ');
  }
  function part3() {
    const qs = (book.questions && book.questions.length ? book.questions : autoQuestions(book)).slice(0, 5);
    R.quiz.total = qs.length;
    if (!qs.length) return finish();
    tutorSay('ตอนที่ 3 จงเติมคำให้สมบูรณ์มีความหมาย');
    let k = 0;
    const ask = () => {
      const q = qs[k];
      const cloze = /_{2,}/.test(q.q);
      showResult('ตอนที่ 3: ' + (cloze ? 'จงเติมคำให้สมบูรณ์มีความหมาย' : 'อ่านแล้วเลือกคำตอบที่ถูกต้อง') + ' (ข้อ ' + (k + 1) + '/' + qs.length + ')', `<p class="say-word" style="font-size:clamp(24px,6vw,34px)">${esc(q.q).replace(/_{2,}/, '<span class="blank"></span>')}</p><div class="rt-parts" id="quizChoices">${q.choices.map((c, j) => `<button class="btn" data-ch="${j}" style="font-size:22px;min-height:60px">${esc(c)}</button>`).join('')}</div>`,
        [['ฟังโจทย์', () => { $('#resultBox').hidden = false; speak(q.q.replace(/_{2,}/, ' อะไร '), 1); }]]);
      $('#quizChoices').onclick = e => {
        const b = e.target.closest('[data-ch]'); if (!b) return;
        if (+b.dataset.ch === q.answer) { R.quiz.ok++; magicSound(false); } else sndOops();
        $('#resultBox').hidden = true; k++;
        setTimeout(() => k < qs.length ? ask() : finish(), 400);
      };
    };
    ask();
  }
  function finish() {
    special = null; keepAwake(false);
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    saveLog({ mode: 'RT', title: book.title, bookId: book.id, words: R.words.total, correct: R.words.ok, wpm: R.passage.wcpm, seconds: R.passage.seconds, score: R.quiz.ok, hardWords: R.words.missed,
              detail: { wordsOk: R.words.ok, wordsTotal: R.words.total, passageOk: R.passage.ok, passageWords: R.passage.words, wcpm: R.passage.wcpm, quizOk: R.quiz.ok, quizTotal: R.quiz.total } });
    if (R.words.missed.length) noteHardWords(R.words.missed);
    showResult('ผลการทดสอบ', `<div class="rt-parts">
      <div class="rt-part"><span>อ่านออกเสียง</span><b>${R.words.ok}/${R.words.total} (${pct(R.words.ok, R.words.total)}%)</b></div>
      <div class="rt-part"><span>อ่านข้อความถูก</span><b>${R.passage.ok}/${R.passage.words} คำ</b></div>
      <div class="rt-part"><span>ความเร็วในการอ่าน</span><b>${R.passage.wcpm} คำ/นาที</b></div>
      <div class="rt-part"><span>อ่านรู้เรื่อง</span><b>${R.quiz.ok}/${R.quiz.total}</b></div></div>`,
      [['ฟังคำชมอีกครั้ง', () => { $('#resultBox').hidden = false; rtFinale(); }], ['กลับไปที่ปกนิทาน', () => { stopSpeech(); $('#rtFw').hidden = true; openBook(book); }, true]]);
    $('#rbTitle').textContent = 'สุดยอด! ทำแบบทดสอบครบ 3 ตอนแล้ว';
    rtFinale();
  }
  intro();
};
// fill-in-the-blank questions from the story when the teacher wrote none
function autoQuestions(book) {
  const sents = book.pages.flatMap(p => p.text.split(/\n+/)).map(s => s.trim()).filter(s => tokenize(s).filter(t => t.readable).length >= 3);
  const vocab = [...new Set(book.pages.flatMap(p => tokenize(p.text).filter(t => t.readable && t.t.replace(/\//g, '').length >= 2).map(t => t.t.replace(/\//g, ''))))];
  return sents.sort(() => Math.random() - 0.5).slice(0, 4).map(s => {
    const toks = tokenize(s).filter(t => t.readable && t.t.replace(/\//g, '').length >= 2);
    const ans = toks[Math.floor(Math.random() * toks.length)].t.replace(/\//g, '');
    const wrong = vocab.filter(v => v !== ans).sort(() => Math.random() - 0.5).slice(0, 2);
    const choices = [ans, ...wrong].sort(() => Math.random() - 0.5);
    return { q: s.replace(/\//g, '').replace(ans, ' ____ '), choices, answer: choices.indexOf(ans) };
  }).filter(q => q.choices.length >= 2);
}

/* ---------- 3) record my reading and compare with the tutor ---------- */
(function recordCompare() {
  const btn = document.createElement('button');
  btn.className = 'btn'; btn.id = 'btnRecMe';
  btn.innerHTML = ICON.mic + '<span>อัดเสียงหนู</span>';
  $('#btnRestart').after(btn);
  addOverlay('recMe', `<div class="big-modal"><div class="card">
    <h3>อัดเสียงหนูอ่าน แล้วฟังเทียบกับพี่ฮูก</h3>
    <p class="login-sub" id="rmText">กด "เริ่มอัด" แล้วอ่านหน้านี้ออกเสียง อ่านจบแล้วกด "หยุด"</p>
    <div class="meter"><i id="rmMeter"></i></div>
    <div class="prow" style="justify-content:center"><button class="btn primary" id="rmRec">${ICON.mic}เริ่มอัด</button><button class="btn" id="rmMine" disabled>${ICON.play}ฟังเสียงหนู</button><button class="btn" id="rmOwl">${ICON.play}ฟังพี่ฮูกอ่าน</button></div>
    <div class="prow" style="justify-content:center"><button class="btn ghost" id="rmClose">ปิด</button></div>
  </div></div>`);
  let sig = null, url = null, audio = null;
  btn.onclick = () => { stopListening(); stopSpeech(); $('#recMe').hidden = false; };
  $('#rmClose').onclick = () => { if (sig && sig.stop) sig.stop(); stopSpeech(); if (audio) audio.pause(); $('#recMe').hidden = true; };
  $('#rmRec').onclick = async () => {
    const b = $('#rmRec');
    if (sig) { sig.stop && sig.stop(); return; }
    sig = {}; b.lastChild.textContent = 'หยุด'; $('#rmText').textContent = 'กำลังอัด… อ่านได้เลย';
    try {
      const { blob } = await recordFor(45000, l => $('#rmMeter').style.width = Math.round(l * 100) + '%', sig);
      if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      $('#rmMine').disabled = false; $('#rmText').textContent = 'อัดเสร็จแล้ว ลองฟังเสียงหนู แล้วฟังพี่ฮูกอ่านเทียบกัน';
    } catch (e) { $('#rmText').textContent = 'ใช้ไมโครโฟนไม่ได้ ลองอนุญาตไมโครโฟนแล้วลองใหม่'; }
    sig = null; b.lastChild.textContent = 'อัดใหม่'; $('#rmMeter').style.width = '0';
  };
  $('#rmMine').onclick = () => { if (!url) return; stopSpeech(); audio = new Audio(url); audio.play().catch(() => {}); };
  $('#rmOwl').onclick = async () => {
    if (audio) audio.pause(); stopSpeech(); const my = speakToken;
    for (const tk of cur.tokens) { if (!tk.readable) continue; if (my !== speakToken) break; await speak(tk.t.replace(/\//g, ''), 1); }
  };
})();

/* ---------- 4) classroom projector mode ---------- */
addSection('vClass', `
  <div class="class-bar"><button class="btn ghost" id="clBack">${ICON.back}ออก</button><h2 id="clTitle"></h2><span class="pager" id="clPager"></span><button class="btn" id="clFull">เต็มจอ</button></div>
  <div class="class-stage"><div class="class-pic" id="clPic"></div><div class="class-text" id="clText"></div></div>
  <div class="class-ctrl">
    <button class="btn" id="clPrevP">◀◀ หน้าก่อน</button><button class="btn" id="clPrevW">◀ คำก่อน</button>
    <button class="btn primary" id="clAuto">${ICON.play}<span>อ่านให้ฟังทีละคำ</span></button>
    <button class="btn" id="clNextW">คำถัดไป ▶</button><button class="btn" id="clNextP">หน้าถัดไป ▶▶</button>
  </div>
  <p class="login-sub" id="classHint" style="text-align:center">ใช้ปุ่มลูกศร ← → หรือ Space เลื่อนทีละคำ ให้นักเรียนอ่านพร้อมกันตามคำที่เน้นสี</p>`);
addStyle(`
#vClass{min-height:calc(100vh - 120px)}
.class-bar{display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.class-bar h2{margin:0;flex:1;font-size:clamp(22px,3vw,34px)}
.class-stage{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:24px;align-items:center}
@media (max-width:800px),(orientation:portrait){.class-stage{grid-template-columns:1fr}}
.class-pic img{width:100%;max-height:62vh;object-fit:contain;border-radius:20px;background:#fff;box-shadow:var(--shadow)}
.class-text{font-family:var(--f-read);font-weight:700;font-size:clamp(40px,5.2vw,86px);line-height:1.8;background:var(--card);border-radius:26px;padding:20px 28px;box-shadow:var(--shadow)}
.class-text .cw{border-radius:14px;padding:0 6px;cursor:pointer;transition:background .2s,color .2s}
.class-text .cw.past{color:var(--ink-faint)}
.class-text .cw.now{background:var(--amber-bg);color:#6b4800;box-shadow:inset 0 -6px 0 var(--sun)}
.class-ctrl{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:18px 0 8px}
.class-ctrl .btn{min-height:56px;font-size:18px}
`);
let CL = { book: null, p: 0, w: -1, auto: false };
window.openClassMode = function (book) {
  CL = { book, p: 0, w: -1, auto: false };
  show('vClass'); keepAwake(true); clRender();
  classFull(true);                       // like pressing F11: the stage fills the whole screen
};
// full screen: the browser's own full screen where it exists (needs the tap that opened the mode),
// and on top of that a page layout that hides everything except the story, which also works on iPhone
function classFull(on) {
  document.body.classList.toggle('class-full', on);
  const de = document.documentElement, fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  try {
    if (on && !fsEl) { const req = de.requestFullscreen || de.webkitRequestFullscreen; if (req) { const r = req.call(de, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } }
    if (!on && fsEl) { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) { const r = ex.call(document); if (r && r.catch) r.catch(() => {}); } }
  } catch (e) {}
  $('#clFull').textContent = on ? 'ย่อหน้าจอ' : 'เต็มจอ';
  window.scrollTo(0, 0);
}
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => {
  if (!(document.fullscreenElement || document.webkitFullscreenElement) && document.body.classList.contains('class-full') && !$('#vClass').hidden) {
    document.body.classList.remove('class-full'); $('#clFull').textContent = 'เต็มจอ';
  }
}));
function clWords() { return tokenize(CL.book.pages[CL.p].text); }
function clRender() {
  const pg = CL.book.pages[CL.p], toks = clWords();
  $('#clTitle').textContent = CL.book.title;
  $('#clPager').textContent = 'หน้า ' + (CL.p + 1) + '/' + CL.book.pages.length;
  $('#clPic').innerHTML = pg.img ? `<img src="${pg.img}" alt="">` : '';
  let r = -1;
  $('#clText').innerHTML = toks.map((t, i) => {
    if (t.br) return '<br>'; if (t.space) return ' ';
    if (!t.readable) return `<span>${esc(t.t)}</span>`;
    r++; return `<span class="cw ${r < CL.w ? 'past' : r === CL.w ? 'now' : ''}" data-r="${r}">${esc(t.t.replace(/\//g, ''))}</span>`;
  }).join('');
}
const clCount = () => clWords().filter(t => t.readable).length;
function clStep(d) {
  const n = clCount(); CL.w += d;
  if (CL.w >= n) { if (CL.p < CL.book.pages.length - 1) { CL.p++; CL.w = 0; } else CL.w = n - 1; }
  if (CL.w < -1) { if (CL.p > 0) { CL.p--; CL.w = clCount() - 1; } else CL.w = -1; }
  clRender();
}
async function clAuto() {
  if (CL.auto) { CL.auto = false; stopSpeech(); $('#clAuto span').textContent = 'อ่านให้ฟังทีละคำ'; return; }
  CL.auto = true; $('#clAuto span').textContent = 'หยุด'; const my = ++speakToken;
  if (CL.w >= clCount() - 1) CL.w = -1;
  while (CL.auto && my === speakToken) {
    CL.w++;
    const words = clWords().filter(t => t.readable);
    if (CL.w >= words.length) { if (CL.p < CL.book.pages.length - 1) { CL.p++; CL.w = 0; } else break; }
    clRender();
    await speak(clWords().filter(t => t.readable)[CL.w].t.replace(/\//g, ''), 1);
    await sleep(250);
  }
  CL.auto = false; $('#clAuto span').textContent = 'อ่านให้ฟังทีละคำ';
}
$('#clBack').onclick = () => { CL.auto = false; stopSpeech(); keepAwake(false); classFull(false); openBook(CL.book); };
$('#clFull').onclick = () => classFull(!document.body.classList.contains('class-full'));
$('#clPrevP').onclick = () => { if (CL.p > 0) { CL.p--; CL.w = -1; clRender(); } };
$('#clNextP').onclick = () => { if (CL.p < CL.book.pages.length - 1) { CL.p++; CL.w = -1; clRender(); } };
$('#clPrevW').onclick = () => clStep(-1);
$('#clNextW').onclick = () => clStep(1);
$('#clAuto').onclick = clAuto;
$('#clText').addEventListener('click', e => { const w = e.target.closest('[data-r]'); if (!w) return; CL.w = +w.dataset.r; clRender(); speak(w.textContent, 1); });
document.addEventListener('keydown', e => {
  if ($('#vClass').hidden) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); clStep(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); clStep(-1); }
  else if (e.key === 'PageDown') $('#clNextP').click();
  else if (e.key === 'PageUp') $('#clPrevP').click();
});

/* single-word modes: no picture, the word fills the card */
const _loadPageSingle = loadPage;
loadPage = function (i) {
  _loadPageSingle(i);
  const single = cur.mode === 'practice' || cur.mode === 'rt-words';
  const pic = document.querySelector('.spread .pic'); if (pic) pic.hidden = single && !cur.book.pages[cur.p].img;
  $('#rText').classList.toggle('single', single);
  $('#btnRecMe').hidden = isTest();
};
addStyle(`#rText.single{font-size:clamp(64px,16vw,120px);text-align:center;line-height:1.6}`);

addStyle(`
body.class-full .top, body.class-full #classHint{display:none}
body.class-full #vClass{position:fixed;inset:0;z-index:45;background:var(--ground);display:flex;flex-direction:column;gap:12px;min-height:0;overflow:auto;
  padding:max(10px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left))}
body.class-full .class-bar{margin:0;flex:none}
body.class-full .class-bar h2{font-size:clamp(18px,2.4vw,30px)}
body.class-full .class-stage{flex:1;min-height:0;gap:18px}
body.class-full .class-pic img{max-height:calc(100dvh - 190px)}
body.class-full .class-text{font-size:clamp(40px,6.4vw,120px);max-height:calc(100dvh - 190px);overflow:auto}
body.class-full .class-ctrl{margin:0;flex:none}
body.class-full .class-ctrl .btn{min-height:50px}
@media (orientation:portrait){body.class-full .class-pic img{max-height:34dvh}body.class-full .class-text{max-height:none}}
`);
