/* นิทานพูดได้ — teacher side: connect the results server, student link, reading dashboard,
   school library (shared stories), and the offline app (PWA) registration. */
'use strict';

/* ---------- connection settings (teacher bar) ---------- */
(function serverSettings() {
  const d = document.createElement('details');
  d.className = 'settings'; d.id = 'srvBox';
  d.innerHTML = `<summary>เชื่อมต่อระบบเก็บผลการอ่าน (Google Sheets)</summary>
    <div class="set-grid">
      <label class="f" for="srvUrl">ลิงก์ Web app ของ Apps Script <small>ได้จากการ Deploy ไฟล์ Code.gs (ดูคู่มือ)</small><input type="text" id="srvUrl" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <label class="f" for="srvPin">รหัสครู <small>ตรงกับ TEACHER_PIN ใน Code.gs ใช้ดูผลและอัปนิทานขึ้นคลัง</small><input type="text" id="srvPin" inputmode="numeric" autocomplete="off"></label>
      <div class="prow"><button class="btn" id="srvTest">ทดสอบการเชื่อมต่อ</button><button class="btn" id="srvLink">คัดลอกลิงก์สำหรับนักเรียน</button></div>
      <div class="ocrst" id="srvStatus"></div>
      <div class="prow"><button class="btn primary" id="btnDash">ดูผลการอ่านของนักเรียน</button></div>
    </div>`;
  $('#teacherBar').appendChild(d);
  $('#srvUrl').value = serverUrl(); $('#srvPin').value = lsGet('tsb-tpin', '');
  $('#srvUrl').onchange = e => { lsSet('tsb-server', e.target.value.trim()); libCache = null; renderShelf(); };
  $('#srvPin').onchange = e => lsSet('tsb-tpin', e.target.value.trim());
  $('#srvTest').onclick = async () => {
    const s = $('#srvStatus'); s.className = 'ocrst busy'; s.textContent = 'กำลังทดสอบ…';
    try { const r = await api('roster'); const n = Object.values(r.rooms).reduce((a, x) => a + x.length, 0); s.className = 'ocrst ok'; s.textContent = `เชื่อมต่อสำเร็จ พบ ${Object.keys(r.rooms).length} ห้อง ${n} คน`; lsSet('tsb-roster', r.rooms); }
    catch (e) { s.className = 'ocrst err'; s.textContent = apiErr(e); }
  };
  $('#srvLink').onclick = async () => {
    if (!hasServer()) { toast('ใส่ลิงก์ Web app ก่อน'); return; }
    const link = location.origin + location.pathname + '?server=' + encodeURIComponent(serverUrl());
    try { await navigator.clipboard.writeText(link); toast('คัดลอกลิงก์แล้ว ส่งให้นักเรียนเปิดครั้งแรกครั้งเดียว'); }
    catch (e) { prompt('คัดลอกลิงก์นี้', link); }
  };
  $('#btnDash').onclick = openDash;
})();

/* ---------- reading dashboard ---------- */
addSection('vDash', `
  <div class="rbar"><button class="btn ghost" id="dashBack">${ICON.back}ชั้นหนังสือ</button><h2>ผลการอ่านของนักเรียน</h2><span class="pager" id="dashSrc"></span></div>
  <div class="prow dash-tools"><select id="dashRoom"></select><input type="text" id="dashFind" placeholder="ค้นหาชื่อ"><button class="btn" id="dashReload">โหลดใหม่</button><a class="btn" id="dashSheet" target="_blank" rel="noopener" hidden>เปิด Google Sheet</a><button class="btn" id="dashCsv">ดาวน์โหลด CSV</button></div>
  <div class="dash-sum" id="dashSum"></div>
  <div class="dash-table" id="dashTable"></div>
  <div id="dashDetail"></div>`);
addStyle(`
.dash-tools{margin-bottom:14px}
.dash-tools select,.dash-tools input{max-width:220px}
.dash-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.dash-sum div{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:12px 16px;box-shadow:var(--shadow-sm)}
.dash-sum b{display:block;font-size:26px;font-variant-numeric:tabular-nums;color:var(--teal)}
.dash-sum span{font-size:13px;color:var(--ink-faint)}
.dash-table{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow-sm)}
.dash-table table{border-collapse:collapse;width:100%;min-width:760px;font-size:15px}
.dash-table th,.dash-table td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.dash-table th{font-size:13px;color:var(--ink-faint);font-weight:700;background:#f6f8fb;position:sticky;top:0}
.dash-table td.n{font-variant-numeric:tabular-nums;text-align:right}
.dash-table tr[data-sid]{cursor:pointer}
.dash-table tr[data-sid]:hover{background:#f3faf8}
.flag{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;background:#ffe2e5;color:#a3202f}
.flag.ok{background:#dff6e8;color:#0b6a43}
.hw{font-family:var(--f-read);font-size:15px;background:#fff4d6;border-radius:8px;padding:0 6px;margin:0 3px 3px 0;display:inline-block}
#dashDetail{margin-top:20px}
`);
let DASH = null;
async function openDash() {
  show('vDash');
  $('#dashTable').innerHTML = '<p class="login-sub" style="padding:16px">กำลังโหลด…</p>'; $('#dashDetail').innerHTML = ''; $('#dashSum').innerHTML = '';
  DASH = null;
  if (hasServer()) {
    try {
      const r = await api('dashboard', { pin: lsGet('tsb-tpin', '') }, 45000);
      DASH = { src: 'server', roster: r.roster, results: r.results.map(x => Object.assign(x, { voiceFlag: x.flag, hardWords: String(x.hard || '').split(' ').filter(Boolean) })), words: r.words, sheetUrl: r.sheetUrl };
      $('#dashSheet').href = r.sheetUrl; $('#dashSheet').hidden = false;
    } catch (e) { toast(apiErr(e) + ' แสดงผลที่เก็บในเครื่องนี้แทน', 5000); }
  }
  if (!DASH) {
    const logs = await localLogs();
    const ids = {}; logs.forEach(l => { ids[l.id] = ids[l.id] || { id: l.id, room: l.room || '-', no: l.no || '', name: l.name || l.id, nick: '' }; });
    DASH = { src: 'local', roster: Object.values(ids), results: logs, words: [] };
    $('#dashSheet').hidden = true;
  }
  $('#dashSrc').textContent = DASH.src === 'server' ? 'ข้อมูลจาก Google Sheets' : 'ข้อมูลในเครื่องนี้';
  const rooms = [...new Set(DASH.roster.map(s => s.room))].sort();
  $('#dashRoom').innerHTML = '<option value="">ทุกห้อง</option>' + rooms.map(r => `<option>${esc(r)}</option>`).join('');
  renderDash();
}
function studentSummary(s) {
  const rs = DASH.results.filter(r => r.id === s.id);
  const best = {}; rs.filter(r => r.mode === 'story' && r.stars).forEach(r => { const k = r.bookId + '|' + r.stage; best[k] = Math.max(best[k] || 0, +r.stars); });
  const stars = Object.values(best).reduce((a, b) => a + b, 0);
  const finished = new Set(rs.filter(r => r.mode === 'finish').map(r => r.bookId)).size;
  const w = rs.filter(r => (r.mode === 'story' || r.mode === 'RT') && +r.wpm > 0).slice(-5);
  const wpm = w.length ? Math.round(w.reduce((a, r) => a + +r.wpm, 0) / w.length) : 0;
  const flags = rs.filter(r => r.voiceFlag && r.voiceFlag !== 'ผ่าน').length;
  const checks = rs.filter(r => r.voiceFlag).length;
  const hard = {};
  if (DASH.words.length) DASH.words.filter(x => x.id === s.id && x.miss > x.learned).forEach(x => hard[x.w] = x.miss);
  else rs.forEach(r => (r.hardWords || []).forEach(h => hard[h] = (hard[h] || 0) + 1));
  const topHard = Object.entries(hard).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
  const last = rs.length ? Math.max(...rs.map(r => +r.time || 0)) : 0;
  const rt = rs.filter(r => r.mode === 'RT').slice(-1)[0];
  return { stars, finished, wpm, flags, checks, topHard, last, reads: rs.filter(r => r.mode === 'story').length, rt };
}
function renderDash() {
  const room = $('#dashRoom').value, q = $('#dashFind').value.trim();
  const list = DASH.roster.filter(s => (!room || s.room === room) && (!q || (s.name + s.nick).includes(q))).sort((a, b) => (a.room + '').localeCompare(b.room + '') || a.no - b.no);
  const sums = list.map(s => [s, studentSummary(s)]);
  const active = sums.filter(([, x]) => x.last > Date.now() - 7 * 864e5).length;
  const wl = sums.filter(([, x]) => x.wpm); const avgW = wl.length ? Math.round(wl.reduce((a, [, x]) => a + x.wpm, 0) / wl.length) : 0;
  $('#dashSum').innerHTML = `<div><b>${list.length}</b><span>นักเรียน</span></div><div><b>${active}</b><span>อ่านใน 7 วันล่าสุด</span></div><div><b>${avgW}</b><span>คำต่อนาที (เฉลี่ย)</span></div><div><b>${sums.reduce((a, [, x]) => a + x.finished, 0)}</b><span>เรื่องที่อ่านจบรวม</span></div><div><b>${sums.reduce((a, [, x]) => a + x.flags, 0)}</b><span>เสียงที่ควรฟังซ้ำ</span></div>`;
  $('#dashTable').innerHTML = `<table><thead><tr><th>ห้อง</th><th>เลขที่</th><th>ชื่อ</th><th>อ่าน (ด่าน)</th><th>จบเรื่อง</th><th>ดาว</th><th>คำ/นาที</th><th>RT ล่าสุด</th><th>ตรวจเสียง</th><th>คำที่ยังสะดุด</th><th>อ่านล่าสุด</th></tr></thead><tbody>${
    sums.map(([s, x]) => `<tr data-sid="${esc(s.id)}"><td>${esc(s.room)}</td><td class="n">${esc(s.no)}</td><td><b>${esc(s.nick || '')}</b> ${esc(s.name)}</td><td class="n">${x.reads}</td><td class="n">${x.finished}</td><td class="n">${x.stars}</td><td class="n">${x.wpm || '-'}</td><td>${x.rt ? `${x.rt.correct}/${x.rt.words} คำ · ${x.rt.wpm} คำ/นาที` : '-'}</td><td>${x.checks ? (x.flags ? `<span class="flag">⚑ ${x.flags}/${x.checks}</span>` : `<span class="flag ok">ผ่าน ${x.checks}</span>`) : '-'}</td><td>${x.topHard.map(h => `<span class="hw">${esc(h)}</span>`).join('')}</td><td>${x.last ? new Date(x.last).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}</td></tr>`).join('')
  }</tbody></table>${list.length ? '' : '<p class="login-sub" style="padding:16px">ยังไม่มีข้อมูล</p>'}`;
}
const MODE_TH = { story: 'อ่านนิทาน', finish: 'จบเรื่อง', practice: 'ฝึกคำยาก', RT: 'ทดสอบ RT' };
async function renderDetail(sid) {
  const s = DASH.roster.find(x => x.id === sid); if (!s) return;
  const rs = DASH.results.filter(r => r.id === sid).slice().reverse().slice(0, 150);
  $('#dashDetail').innerHTML = `<h3 class="shelf-title">${esc(s.name)} · ${esc(s.room)} เลขที่ ${esc(s.no)}</h3><div class="dash-table"><table><thead><tr><th>วันเวลา</th><th>กิจกรรม</th><th>นิทาน</th><th>ด่าน</th><th>อ่านถูกเอง/ทั้งหมด</th><th>ช่วย</th><th>ข้าม</th><th>คำ/นาที</th><th>ดาว</th><th>ตรวจเสียง</th><th>คำที่สะดุด</th></tr></thead><tbody>${
    rs.map(r => `<tr><td>${r.time ? new Date(+r.time).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td><td>${MODE_TH[r.mode] || esc(r.mode)}</td><td>${esc(r.title || '')}</td><td class="n">${r.stage === '' || r.stage === undefined ? '' : +r.stage + 1}</td><td class="n">${r.correct || 0}/${r.words || 0}</td><td class="n">${r.helped || 0}</td><td class="n">${r.skipped || 0}</td><td class="n">${r.wpm || '-'}</td><td class="n">${r.stars || ''}</td><td>${r.voiceFlag ? `<span class="flag${r.voiceFlag === 'ผ่าน' ? ' ok' : ''}">${esc(r.voiceFlag)}</span> ${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">ฟังเสียง</a>` : r.hasClip ? `<button class="btn" data-clip="${r.time}" style="padding:2px 10px;min-height:0">ฟังเสียง</button>` : ''}` : ''}</td><td>${(r.hardWords || []).map(h => `<span class="hw">${esc(h)}</span>`).join('')}</td></tr>`).join('')
  }</tbody></table></div>`;
  $('#dashDetail').scrollIntoView({ behavior: 'smooth' });
}
$('#dashRoom').onchange = renderDash;
$('#dashFind').oninput = renderDash;
$('#dashReload').onclick = openDash;
$('#dashBack').onclick = () => { show('vLib'); renderShelf(); };
$('#dashTable').addEventListener('click', e => { const tr = e.target.closest('[data-sid]'); if (tr) renderDetail(tr.dataset.sid); });
$('#dashDetail').addEventListener('click', async e => {
  const b = e.target.closest('[data-clip]'); if (!b) return;
  const c = await hqDB.get('clip|' + b.dataset.clip); if (!c) { toast('ไม่พบไฟล์เสียง'); return; }
  const blob = await (await fetch(`data:${c.mime || 'audio/webm'};base64,${c.b64}`)).blob();
  new Audio(URL.createObjectURL(blob)).play().catch(() => {});
});
$('#dashCsv').onclick = () => {
  if (!DASH) return;
  const head = ['เวลา', 'รหัส', 'ห้อง', 'เลขที่', 'ชื่อ', 'กิจกรรม', 'นิทาน', 'ด่าน', 'จำนวนคำ', 'อ่านถูกเอง', 'ช่วย', 'ข้าม', 'ผิด', 'วินาที', 'คำต่อนาที', 'ดาว', 'ตรวจเสียง', 'คำที่สะดุด'];
  const nameOf = id => DASH.roster.find(s => s.id === id) || {};
  const rows = DASH.results.map(r => { const s = nameOf(r.id); return [r.time ? new Date(+r.time).toLocaleString('th-TH') : '', r.id, s.room || r.room || '', s.no || r.no || '', s.name || r.name || '', MODE_TH[r.mode] || r.mode, r.title || '', r.stage === '' || r.stage === undefined ? '' : +r.stage + 1, r.words || 0, r.correct || 0, r.helped || 0, r.skipped || 0, r.wrongs || 0, r.seconds || 0, r.wpm || 0, r.stars || 0, r.voiceFlag || '', (r.hardWords || []).join(' ')]; });
  const csv = '﻿' + [head, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'ผลการอ่าน.csv'; document.body.appendChild(a); a.click(); a.remove();
};

/* ---------- school library: share stories through the server ---------- */
let libCache = null;
window.libraryUploadButton = b => teacher && hasServer() && !b.builtin ? `<button class="btn" data-up="${esc(b.id)}">อัปขึ้นคลังโรงเรียน</button>` : '';
function thumbOf(src) {
  return new Promise(res => { if (!src) return res(''); const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const s = 220 / Math.max(img.naturalWidth, img.naturalHeight); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7)); }; img.onerror = () => res(''); img.src = src; });
}
$('#shelf').addEventListener('click', async e => {
  const up = e.target.closest('[data-up]');
  if (up) {
    const b = findBook(up.dataset.up); up.disabled = true; up.textContent = 'กำลังอัป…';
    try {
      const data = { id: b.id, title: b.title, spell: b.spell || '', cover: b.cover || '', questions: b.questions || [], pages: b.pages };
      await api('library_put', { pin: lsGet('tsb-tpin', ''), book: data, thumb: await thumbOf(b.cover || (b.pages[0] && b.pages[0].img)), level: bookLevel(b).level + ' ' + bookLevel(b).grade, by: 'ครู' }, 120000);
      toast('อัป "' + b.title + '" ขึ้นคลังโรงเรียนแล้ว นักเรียนทุกเครื่องเห็นทันที'); libCache = null;
    } catch (err) { toast(apiErr(err)); }
    up.disabled = false; up.textContent = 'อัปขึ้นคลังโรงเรียน';
    return;
  }
});
async function renderLibrary() {
  let box = $('#libBox');
  if (!hasServer()) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'libBox'; $('#shelf').after(box); }
  if (!libCache || Date.now() - libCache.t > 300000) {
    try { const r = await api('library_list'); libCache = { t: Date.now(), books: r.books }; }
    catch (e) { box.innerHTML = ''; return; }
  }
  const local = new Set(books.map(b => b.id));
  const list = libCache.books.filter(b => !local.has(b.id));
  box.innerHTML = list.length ? `<h3 class="shelf-title" style="margin-top:28px">คลังนิทานของโรงเรียน</h3><div class="shelf">${list.map(b => `
    <div class="book-wrap"><button class="book" data-lib="${esc(b.id)}">${b.thumb ? `<img class="cover" src="${b.thumb}" alt="">` : '<div class="cover"></div>'}${b.level ? `<span class="lvl">${esc(b.level)}</span>` : ''}
      <span class="meta"><span class="t">${esc(b.title)}</span><span class="n">${b.pages} ด่าน · แตะเพื่อโหลด</span></span></button>
      ${teacher ? `<div class="book-tools"><button class="btn danger" data-libdel="${esc(b.id)}">ลบจากคลัง</button></div>` : ''}</div>`).join('')}</div>` : '';
}
document.addEventListener('tsb:shelf', renderLibrary);
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-lib]');
  if (b) {
    b.disabled = true; b.querySelector('.n').textContent = 'กำลังโหลด…';
    try { const r = await api('library_get', { id: b.dataset.lib }, 120000); const bk = await importJSON(r.book); toast('โหลด "' + bk.title + '" แล้ว'); openBook(findBook(bk.id)); }
    catch (err) { toast(apiErr(err)); b.disabled = false; }
    return;
  }
  const d = e.target.closest('[data-libdel]');
  if (d) {
    if (d.dataset.confirm !== '1') { d.dataset.confirm = '1'; d.textContent = 'กดอีกครั้งเพื่อลบ'; return; }
    try { await api('library_del', { pin: lsGet('tsb-tpin', ''), id: d.dataset.libdel }); libCache = null; renderLibrary(); toast('ลบจากคลังแล้ว'); } catch (err) { toast(apiErr(err)); }
  }
});

/* ---------- offline app ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    // check for a new version whenever the app comes back to the screen
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {}));
  // a new version took over: reload once so the page matches it (not while a child is reading or recording)
  const hadSW = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadSW || reloading) return;
    const busy = () => (typeof listening !== 'undefined' && listening) || !document.getElementById('vRead').hidden;
    const go = () => { if (busy()) { setTimeout(go, 3000); return; } reloading = true; location.reload(); };
    go();
  });
}

/* ---------- teacher area is locked with the teacher code ----------
   Everyone with the link can read the stories. Making stories from photos, importing files, editing,
   recording, AI, the library tools and the results page all need the teacher code. */
addOverlay('pinGate', `<div class="big-modal"><div class="card">
  <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="justify-self:center;color:var(--teal)"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
  <h3>สำหรับครู</h3><p class="login-sub" id="pgText">ใส่รหัสครูเพื่อสร้างนิทานจากภาพ นำเข้าไฟล์ และใช้ระบบของครู</p>
  <input type="password" id="pgPin" autocomplete="off" autocapitalize="characters" spellcheck="false" style="font-size:24px;text-align:center;max-width:260px;justify-self:center;letter-spacing:2px">
  <label class="autohelp" for="pgRemember" style="justify-content:center"><input type="checkbox" id="pgRemember">จำเครื่องนี้ไว้ (ใช้เฉพาะเครื่องของครู)</label>
  <p class="ocrst err" id="pgErr"></p>
  <div class="prow" style="justify-content:center"><button class="btn ghost" id="pgCancel">ยกเลิก</button><button class="btn primary" id="pgOk">เข้าสู่ระบบครู</button></div>
</div></div>`);
const CODE_SALT = 'tsb-teacher-v1|';
const codeHash = () => String((window.TSB_CONFIG && TSB_CONFIG.TEACHER_CODE_SHA256) || '').toLowerCase();
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
// unlocked = remembered on this device for the current code, or unlocked during this browser session
function teacherUnlocked() {
  let ses = false; try { ses = sessionStorage.getItem('tsb-tunlock') === codeHash(); } catch (e) {}
  return ses || (!!codeHash() && lsGet('tsb-tunlock', '') === codeHash());
}
// anyone who switched teacher mode on before the lock existed is switched back off
if (teacher && !teacherUnlocked()) { teacher = false; lsSet('tsb-teacher', false); }
let afterUnlock = null;
function askTeacherCode(then) {
  afterUnlock = then || null;
  $('#pgPin').value = ''; $('#pgErr').textContent = ''; $('#pgRemember').checked = false;
  $('#pinGate').hidden = false; setTimeout(() => $('#pgPin').focus(), 50);
}
window.requireTeacher = function (then) {          // run `then` only for a teacher
  if (teacher && teacherUnlocked()) { then && then(); return true; }
  askTeacherCode(() => { enterTeacher(); then && then(); });
  return false;
};
function enterTeacher() {
  teacher = true; $('#teacherToggle').checked = true; lsSet('tsb-teacher', true);
  if (!$('#vLogin').hidden) show('vLib');
  renderShelf();
}
(function teacherGate() {
  const tg = $('#teacherToggle');
  tg.addEventListener('change', e => {
    if (!tg.checked) {                             // switching off also locks this session again
      try { sessionStorage.removeItem('tsb-tunlock'); } catch (err) {}
      return;
    }
    if (teacherUnlocked()) return;
    e.stopImmediatePropagation();
    tg.checked = false; teacher = false; lsSet('tsb-teacher', false);
    askTeacherCode(enterTeacher);
  }, true);
  const check = async () => {
    const pin = $('#pgPin').value.trim().toUpperCase(); if (!pin) return;
    let ok = false;
    try { ok = !!codeHash() && (await sha256(CODE_SALT + pin)) === codeHash(); } catch (e) {}
    if (!ok && hasServer()) {
      $('#pgErr').textContent = 'กำลังตรวจ…';
      try { await api('teacher_check', { pin: $('#pgPin').value.trim() }); ok = true; lsSet('tsb-tpin', $('#pgPin').value.trim()); } catch (err) {}
    }
    if (!ok) { $('#pgErr').textContent = 'รหัสครูไม่ถูกต้อง'; sndOops(); return; }
    try { sessionStorage.setItem('tsb-tunlock', codeHash()); } catch (e) {}
    if ($('#pgRemember').checked) lsSet('tsb-tunlock', codeHash());
    $('#pinGate').hidden = true;
    const f = afterUnlock; afterUnlock = null; f && f();
  };
  $('#pgOk').onclick = check;
  $('#pgPin').onkeydown = e => { if (e.key === 'Enter') check(); };
  $('#pgCancel').onclick = () => { afterUnlock = null; $('#pinGate').hidden = true; };
})();

/* ---------- hide the photo-to-story tools from people without the code ---------- */
(function lockTeacherTools() {
  const tools = $('#btnCam').parentElement;
  const heroTitle = document.querySelector('.hero h2'), heroText = document.querySelector('.hero p');
  const studentHero = { h: 'เลือกนิทานแล้วฝึกอ่านกับพี่ฮูก', p: 'แตะนิทานที่อยากอ่าน อ่านออกเสียงให้พี่ฮูกฟัง อ่านจบแต่ละด่านจะได้ดาว' };
  const teacherHero = { h: heroTitle.textContent, p: heroText.textContent };
  const paint = () => {
    const t = teacher && teacherUnlocked();
    tools.hidden = !t;
    heroTitle.textContent = t ? teacherHero.h : studentHero.h;
    heroText.textContent = t ? teacherHero.p : studentHero.p;
  };
  document.addEventListener('tsb:shelf', paint);
  paint();
  // every teacher entry point checks again, even if a button is made visible by hand
  const guard = (fn) => function (...a) { if (!(teacher && teacherUnlocked())) { requireTeacher(); return; } return fn.apply(this, a); };
  newFromPhotos = guard(newFromPhotos);
  openEditor = guard(openEditor);
  ['btnCam', 'btnPick', 'btnNew', 'btnImport', 'btnRecView', 'btnAI', 'btnDash'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('click', e => { if (!(teacher && teacherUnlocked())) { e.stopImmediatePropagation(); e.preventDefault(); requireTeacher(); } }, true);
  });
  ['camIn', 'pickIn', 'importFile'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('change', e => { if (!(teacher && teacherUnlocked())) { e.stopImmediatePropagation(); el.value = ''; requireTeacher(); } }, true);
  });
})();
addStyle(`@media (max-width:560px){.switch{font-size:0;gap:0;padding:6px}.switch input{margin:0}.top{flex-wrap:nowrap}.me-chip{max-width:44vw}}`);
