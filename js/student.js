/* นิทานพูดได้ — student sign-in, voice check (enrollment) and random voice spot checks */
'use strict';

/* ---------- header: who is reading ---------- */
(function headerChip() {
  const top = document.querySelector('.top');
  const box = document.createElement('div');
  box.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
  box.innerHTML = `<span id="syncBadge" hidden></span><button class="me-chip" id="meChip" hidden><svg data-owl viewBox="0 0 80 80" aria-hidden="true"></svg><span class="nm"></span><span class="st"></span></button>`;
  top.insertBefore(box, top.querySelector('.switch'));
  const upd = () => {
    const c = $('#meChip');
    c.hidden = !ME;
    if (ME) { c.querySelector('.nm').textContent = meName(); c.querySelector('.st').textContent = '★ ' + totalStars(); }
    renderOwls(); updateSyncBadge();
  };
  document.addEventListener('tsb:me', upd);
  document.addEventListener('tsb:view', upd);
  $('#meChip').onclick = () => openMe();
  upd();
})();

/* ---------- sign-in view ---------- */
addSection('vLogin', `
  <div class="login">
    <svg class="owl" data-owl viewBox="0 0 80 80" aria-hidden="true"></svg>
    <h2 id="loginTitle">ใครกำลังจะอ่านนิทานนะ?</h2>
    <p class="login-sub" id="loginSub">แตะห้องของหนูก่อนเลย</p>
    <div id="loginBody"></div>
    <div class="prow login-foot"><button class="btn ghost" id="loginBackBtn" hidden>${ICON.back}ย้อนกลับ</button><button class="btn ghost" id="loginGuest">อ่านโดยไม่ลงชื่อ</button></div>
  </div>`);
addStyle(`
.login{max-width:760px;margin:0 auto;text-align:center;display:grid;gap:10px;justify-items:center}
.login .owl{width:110px;height:120px;animation:float 4s ease-in-out infinite}
.login h2{margin:0;font-size:clamp(24px,4vw,34px)}
.login-sub{margin:0;color:var(--ink-soft)}
#loginBody{width:100%}
.room-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-top:8px}
.room-grid .btn{min-height:76px;font-size:22px;border-radius:22px}
.kid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:8px}
.kid{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:12px 10px;display:grid;gap:2px;box-shadow:var(--shadow-sm);text-align:center}
.kid b{font-size:22px}.kid span{font-size:13px;color:var(--ink-faint)}.kid i{font-style:normal;font-weight:800;color:var(--teal)}
.pin-dots{display:flex;gap:14px;justify-content:center;margin:6px 0}
.pin-dots i{width:22px;height:22px;border-radius:50%;border:3px solid var(--teal)}
.pin-dots i.on{background:var(--teal)}
.pin-pad{display:grid;grid-template-columns:repeat(3,84px);gap:12px;justify-content:center}
.pin-pad .btn{height:76px;font-size:30px;border-radius:24px}
.login-foot{justify-content:center;margin-top:10px}
.login input[type=text]{font-size:22px;text-align:center;max-width:360px}
`);
let loginState = { room: '', kid: null, pin: '' };
async function showLogin() {
  show('vLogin'); renderOwls();
  loginState = { room: '', kid: null, pin: '' };
  if (!hasServer()) return loginLocal();
  $('#loginTitle').textContent = 'ใครกำลังจะอ่านนิทานนะ?';
  $('#loginSub').textContent = 'กำลังโหลดรายชื่อ…';
  $('#loginBody').innerHTML = ''; $('#loginBackBtn').hidden = true;
  let rooms = lsGet('tsb-roster', null);
  try { const r = await api('roster'); rooms = r.rooms; lsSet('tsb-roster', rooms); }
  catch (e) { if (!rooms) { $('#loginSub').textContent = apiErr(e); $('#loginBody').innerHTML = '<button class="btn primary" id="loginRetry">ลองใหม่</button>'; $('#loginRetry').onclick = showLogin; return; } }
  loginRooms(rooms);
}
function loginRooms(rooms) {
  $('#loginSub').textContent = 'แตะห้องของหนูก่อนเลย'; $('#loginBackBtn').hidden = true;
  const names = Object.keys(rooms).sort();
  $('#loginBody').innerHTML = names.length ? `<div class="room-grid">${names.map(r => `<button class="btn" data-room="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : '<p>ยังไม่มีรายชื่อนักเรียน ครูใส่รายชื่อใน Google Sheet แท็บ "รายชื่อนักเรียน"</p>';
  $('#loginBody').onclick = e => { const b = e.target.closest('[data-room]'); if (b) loginKids(rooms, b.dataset.room); };
}
function loginKids(rooms, room) {
  loginState.room = room;
  $('#loginSub').textContent = 'ห้อง ' + room + ' · แตะชื่อของหนู';
  $('#loginBackBtn').hidden = false; $('#loginBackBtn').onclick = () => loginRooms(rooms);
  $('#loginBody').innerHTML = `<div class="kid-grid">${rooms[room].map(k => `<button class="kid" data-no="${esc(k.no)}"><i>เลขที่ ${esc(k.no)}</i><b>${esc(k.nick || k.name.split(' ')[0])}</b><span>${esc(k.name)}</span></button>`).join('')}</div>`;
  $('#loginBody').onclick = e => { const b = e.target.closest('[data-no]'); if (b) loginPin(rooms, rooms[room].find(k => String(k.no) === b.dataset.no)); };
}
function loginPin(rooms, kid) {
  loginState.kid = kid; loginState.pin = '';
  $('#loginSub').textContent = 'สวัสดี ' + (kid.nick || kid.name) + ' ใส่รหัส 4 ตัวของหนู';
  $('#loginBackBtn').onclick = () => loginKids(rooms, loginState.room);
  const pad = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'ลบ', 0, 'ตกลง'];
  $('#loginBody').innerHTML = `<div class="pin-dots" id="pinDots">${'<i></i>'.repeat(4)}</div><div class="pin-pad">${pad.map(k => `<button class="btn${k === 'ตกลง' ? ' primary' : ''}" data-k="${k}">${k}</button>`).join('')}</div><p id="pinMsg" class="login-sub"></p>`;
  const dots = () => [...$('#pinDots').children].forEach((d, i) => d.classList.toggle('on', i < loginState.pin.length));
  $('#loginBody').onclick = async e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const k = b.dataset.k;
    if (k === 'ลบ') loginState.pin = loginState.pin.slice(0, -1);
    else if (k === 'ตกลง' || loginState.pin.length === 3 && /\d/.test(k)) {
      if (k !== 'ตกลง') loginState.pin += k;
      dots(); if (loginState.pin.length < 4) return;
      $('#pinMsg').textContent = 'กำลังตรวจรหัส…';
      try {
        const r = await api('login', { room: loginState.room, no: kid.no, pin: loginState.pin });
        setMe(Object.assign({}, r.student, { token: r.token, voice: r.voice }));
        mergeProgress(r.progress); mergeServerWords(r.hardWords);
        afterLogin();
      } catch (err) { $('#pinMsg').textContent = apiErr(err) + ' ลองใหม่นะ'; loginState.pin = ''; dots(); sndOops(); }
      return;
    } else if (/\d/.test(k) && loginState.pin.length < 4) loginState.pin += k;
    dots();
  };
}
function loginLocal() {
  $('#loginTitle').textContent = 'หนูชื่ออะไรนะ?';
  $('#loginSub').textContent = 'พิมพ์ชื่อเล่นของหนู (ผลการอ่านเก็บไว้ในเครื่องนี้)';
  $('#loginBackBtn').hidden = true;
  $('#loginBody').innerHTML = `<div class="prow" style="justify-content:center"><input type="text" id="localName" maxlength="30" placeholder="ชื่อเล่น"><button class="btn primary" id="localGo">เริ่มเลย</button></div>`;
  $('#localGo').onclick = () => {
    const n = $('#localName').value.trim(); if (!n) { $('#localName').focus(); return; }
    const id = 'local-' + n;
    const prev = lsGet('tsb-local-voice-' + id, null);
    setMe({ id, name: n, nick: n, room: '', no: '', local: true, voice: prev });
    afterLogin();
  };
}
$('#loginGuest').onclick = () => { setMe(null); lsSet('tsb-guest', true); show('vLib'); renderShelf(); };
function afterLogin() {
  lsSet('tsb-guest', false);
  if (!ME.voice) openVoiceEnroll(() => { show('vLib'); renderShelf(); tutorWelcome(); });
  else { show('vLib'); renderShelf(); tutorWelcome(); }
}
function tutorWelcome() { toast('สวัสดี ' + meName() + ' เลือกนิทานที่อยากอ่านได้เลย'); }
function logout() { stopListening(); setMe(null); showLogin(); }

/* ---------- voice check: test the mic, then learn the child's voice ---------- */
const ENROLL_WORDS = ['แมว', 'ปลา', 'ดอกไม้'];
addOverlay('voiceModal', `<div class="big-modal"><div class="card">
  <svg class="owl" data-owl viewBox="0 0 80 80" style="width:84px;height:92px;justify-self:center" aria-hidden="true"></svg>
  <h3 id="vcTitle">เช็คเสียงก่อนอ่าน</h3>
  <p id="vcText" class="login-sub"></p>
  <div class="say-word" id="vcWord"></div>
  <div class="meter"><i id="vcMeter"></i></div>
  <div class="prow" style="justify-content:center"><button class="btn primary" id="vcGo">${ICON.mic}พร้อมแล้ว กดแล้วพูดเลย</button><button class="btn ghost" id="vcSkip" hidden>ไมค์มีปัญหา ข้ามไปก่อน</button></div>
</div></div>`);
async function openVoiceEnroll(done) {
  stopListening(); stopSpeech();
  const m = $('#voiceModal'); m.hidden = false; renderOwls();
  const samples = []; let firstClip = null, step = 0, fails = 0;
  const setStep = () => {
    $('#vcTitle').textContent = step === 0 ? 'เช็คเสียงก่อนอ่าน' : 'ให้พี่ฮูกจำเสียงหนู (' + step + '/' + ENROLL_WORDS.length + ')';
    $('#vcText').textContent = step === 0 ? 'พูดว่า "สวัสดีครับ" หรือ "สวัสดีค่ะ" ดัง ๆ ใกล้เครื่อง แถบสีจะขยับตามเสียง' : 'พูดคำนี้ดัง ๆ ชัด ๆ';
    $('#vcWord').textContent = step === 0 ? 'สวัสดี' : ENROLL_WORDS[step - 1];
    $('#vcMeter').style.width = '0';
  };
  setStep();
  $('#vcSkip').hidden = true;
  $('#vcSkip').onclick = () => { m.hidden = true; if (ME) { ME.voice = { f0: 0, skipped: true }; setMe(ME); } done && done(); };
  $('#vcGo').onclick = async () => {
    const btn = $('#vcGo'); btn.disabled = true; btn.lastChild.textContent = 'กำลังฟัง…';
    try {
      const { blob, mime } = await recordFor(2600, l => $('#vcMeter').style.width = Math.round(l * 100) + '%');
      const a = await analyzeVoice(blob);
      if (a.voiced < 0.25) {
        fails++; sndOops(); $('#vcText').textContent = 'พี่ฮูกยังไม่ได้ยินเสียง ลองพูดดังขึ้นอีกนิดนะ';
        if (fails >= 2) $('#vcSkip').hidden = false;
      } else {
        magicSound(false);
        if (step > 0) { samples.push(a); if (!firstClip) firstClip = { blob, mime }; }
        step++;
        if (step > ENROLL_WORDS.length) {
          const f0s = samples.map(s => s.f0).filter(Boolean).sort((p, q) => p - q);
          const prof = { f0: f0s[Math.floor(f0s.length / 2)] || 0, centroid: Math.round(samples.reduce((x, s) => x + s.centroid, 0) / samples.length), n: samples.length };
          ME.voice = prof; setMe(ME);
          if (ME.local) lsSet('tsb-local-voice-' + ME.id, prof);
          else if (hasServer()) enqueue('enroll', { id: ME.id, token: ME.token, name: ME.name, f0: prof.f0, centroid: prof.centroid, n: prof.n, clip: await blobToB64(firstClip.blob), mime: firstClip.mime });
          $('#vcTitle').textContent = 'พี่ฮูกจำเสียงหนูได้แล้ว!'; $('#vcText').textContent = 'ไปอ่านนิทานกันเลย'; $('#vcWord').textContent = '🎉';
          await sleep(1300); m.hidden = true; btn.disabled = false; btn.lastChild.textContent = 'พร้อมแล้ว กดแล้วพูดเลย'; done && done(); return;
        }
        setStep();
      }
    } catch (e) {
      fails++; $('#vcText').textContent = e.message === 'mic_denied' ? 'ยังไม่ได้อนุญาตให้ใช้ไมโครโฟน กดอนุญาตแล้วลองใหม่' : 'ใช้ไมโครโฟนไม่ได้ ลองใหม่อีกครั้ง';
      $('#vcSkip').hidden = false;
    }
    btn.disabled = false; btn.lastChild.textContent = 'พร้อมแล้ว กดแล้วพูดเลย';
  };
}

/* ---------- random spot check during a story (teacher hears the clip) ---------- */
// resolves {verdict, clip, mime} — the child only ever sees a friendly message
function voiceSpotCheck(word) {
  return new Promise(resolve => {
    stopListening(); stopSpeech();
    const m = $('#voiceModal'); m.hidden = false; renderOwls();
    $('#vcTitle').textContent = 'พี่ฮูกขอฟังเสียงหนูหน่อย';
    $('#vcText').textContent = 'กดปุ่มแล้วพูดคำนี้ดัง ๆ นะ';
    $('#vcWord').textContent = word; $('#vcMeter').style.width = '0';
    $('#vcSkip').hidden = true;
    $('#vcGo').disabled = false; $('#vcGo').lastChild.textContent = 'พร้อมแล้ว กดแล้วพูดเลย';
    let tries = 0;
    $('#vcGo').onclick = async () => {
      const btn = $('#vcGo'); btn.disabled = true; btn.lastChild.textContent = 'กำลังฟัง…';
      try {
        const { blob, mime } = await recordFor(3000, l => $('#vcMeter').style.width = Math.round(l * 100) + '%');
        const a = await analyzeVoice(blob);
        tries++;
        if (a.voiced < 0.25 && tries < 2) { $('#vcText').textContent = 'ยังไม่ได้ยินเลย พูดดังขึ้นอีกนิดนะ'; btn.disabled = false; btn.lastChild.textContent = 'พร้อมแล้ว กดแล้วพูดเลย'; return; }
        const verdict = voiceVerdict(a, ME && ME.voice);
        magicSound(false);
        $('#vcTitle').textContent = 'ขอบคุณจ้ะ ไปอ่านต่อกันเลย';
        await sleep(800); m.hidden = true;
        btn.disabled = false; btn.lastChild.textContent = 'พร้อมแล้ว กดแล้วพูดเลย';
        resolve({ verdict, sample: a, clip: await blobToB64(blob), mime });
      } catch (e) {
        m.hidden = true; btn.disabled = false; btn.lastChild.textContent = 'พร้อมแล้ว กดแล้วพูดเลย';
        resolve({ verdict: 'ใช้ไมค์ตรวจเสียงไม่ได้', clip: '', mime: '' });
      }
    };
  });
}

/* ---------- my page: stars, owl outfits, stickers, hard words ---------- */
addSection('vMe', `
  <div class="rbar"><button class="btn ghost" id="meBack">${ICON.back}ชั้นหนังสือ</button><h2>ของหนู</h2><button class="btn ghost" id="meLogout">เปลี่ยนคนอ่าน</button></div>
  <div class="me-hero"><svg class="owl" data-owl viewBox="0 0 80 80" aria-hidden="true"></svg><div><h3 id="meName"></h3><div class="me-stars" id="meStars"></div><p class="login-sub" id="meNext"></p></div></div>
  <h3 class="shelf-title">ชุดแต่งตัวพี่ฮูก</h3><div class="outfits" id="meOutfits"></div>
  <h3 class="shelf-title">คำที่ควรฝึก</h3><div class="panel" id="meWords"></div>
  <h3 class="shelf-title">สติกเกอร์นิทานที่อ่านจบ</h3><div class="stickers" id="meStickers"></div>`);
addStyle(`
.me-hero{display:flex;gap:18px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:18px;box-shadow:var(--shadow);margin-bottom:24px}
.me-hero .owl{width:110px;height:126px;flex:none}
.me-hero h3{margin:0;font-size:26px}
.me-stars{font-size:22px;font-weight:800;color:var(--sun-deep)}
.outfits{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-bottom:24px}
.outfit{background:var(--card);border:2px solid var(--line);border-radius:20px;padding:10px;display:grid;justify-items:center;gap:4px;font-weight:700;font-size:14px}
.outfit svg{width:64px;height:72px}
.outfit.on{border-color:var(--teal);background:#effaf8}
.outfit.locked{opacity:.5}
.outfit small{color:var(--ink-faint);font-weight:600}
.stickers{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px}
.sticker{aspect-ratio:1;border-radius:50%;overflow:hidden;border:5px solid #fff;box-shadow:var(--shadow);transform:rotate(-4deg);background:#eef3f8;display:grid;place-items:center;text-align:center;font-weight:700;font-size:13px;padding:6px}
.sticker:nth-child(2n){transform:rotate(5deg)}
.sticker img{width:100%;height:100%;object-fit:cover}
#meWords{margin-bottom:24px}
.word-chips{display:flex;flex-wrap:wrap;gap:8px}
.word-chips span{font-family:var(--f-read);font-size:22px;font-weight:600;background:#fff4d6;border-radius:12px;padding:2px 12px}
`);
function openMe() {
  if (!ME) { showLogin(); return; }
  show('vMe');
  const stars = totalStars();
  $('#meName').textContent = ME.name + (ME.room ? ' · ' + ME.room : '');
  $('#meStars').textContent = '★ ' + stars + ' ดาว';
  const next = OUTFITS.find(o => o.stars > stars);
  $('#meNext').textContent = next ? 'อีก ' + (next.stars - stars) + ' ดาว ได้ "' + next.name + '"' : 'ปลดล็อกชุดครบทุกแบบแล้ว สุดยอด!';
  const cur0 = currentOutfit().id;
  $('#meOutfits').innerHTML = OUTFITS.map(o => `<button class="outfit${o.id === cur0 ? ' on' : ''}${stars < o.stars ? ' locked' : ''}" data-of="${o.id}"><svg viewBox="0 -10 80 92">${(o.back ? o.svg : '') + OWL + (o.back ? '' : o.svg)}</svg>${o.name}<small>${stars < o.stars ? '🔒 ' + o.stars + ' ดาว' : o.stars ? 'ปลดล็อกแล้ว' : ''}</small></button>`).join('');
  const due = dueWords(30), all = Object.keys(wordBank());
  $('#meWords').innerHTML = all.length ? `<p class="login-sub">คำที่เคยสะดุด ${all.length} คำ ถึงรอบฝึกวันนี้ ${due.length} คำ</p><div class="word-chips">${due.slice(0, 20).map(w => `<span>${esc(w)}</span>`).join('')}</div><div class="prow" style="margin-top:10px"><button class="btn primary" id="mePractice" ${due.length ? '' : 'disabled'}>ฝึกคำยากเลย</button></div>` : '<p class="login-sub">ยังไม่มีคำที่ต้องฝึก เก่งมาก!</p>';
  const fin = finishedBooks();
  $('#meStickers').innerHTML = fin.length ? fin.map(b => `<div class="sticker" title="${esc(b.title)}">${(b.cover || b.pages[0].img) ? `<img src="${b.cover || b.pages[0].img}" alt="${esc(b.title)}">` : esc(b.title)}</div>`).join('') : '<p class="login-sub">อ่านนิทานให้จบเรื่อง จะได้สติกเกอร์ปกนิทานมาสะสม</p>';
  renderOwls();
  const pr = $('#mePractice'); if (pr) pr.onclick = () => startPractice();
}
$('#meBack').onclick = () => { show('vLib'); renderShelf(); };
$('#meLogout').onclick = logout;
$('#meOutfits').addEventListener('click', e => {
  const b = e.target.closest('[data-of]'); if (!b) return;
  const o = OUTFITS.find(x => x.id === b.dataset.of);
  if (totalStars() < o.stars) { toast('สะสมให้ครบ ' + o.stars + ' ดาวก่อนนะ'); return; }
  lsSet(outfitKey(), o.id); renderOwls(); openMe(); magicSound(false);
});

/* ---------- boot: who is reading? ---------- */
document.addEventListener('tsb:boot', () => {
  renderOwls(); flushQueue();
  if (teacher) return;
  if (!ME && !lsGet('tsb-guest', false)) showLogin();
});
$('#teacherToggle').addEventListener('change', () => { if (!teacher && !ME && !lsGet('tsb-guest', false)) showLogin(); else if (teacher && !$('#vLogin').hidden) { show('vLib'); renderShelf(); } });
