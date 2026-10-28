/**
 * นิทานพูดได้ — ระบบเก็บผลการอ่าน (Google Apps Script)
 * ---------------------------------------------------
 * ใช้คู่กับ https://godhandwarayu-beep.github.io/talking-storybook/
 *
 * ตั้งค่าครั้งแรก
 *  1) แก้ TEACHER_PIN ด้านล่างเป็นรหัสครู (ตัวเลขที่จำได้)
 *  2) เลือกฟังก์ชัน setup แล้วกด Run หนึ่งครั้ง (อนุญาตสิทธิ์ Drive/Sheets)
 *  3) Deploy > New deployment > Web app
 *       Execute as: Me   ·   Who has access: Anyone
 *  4) คัดลอก Web app URL ไปใส่ในแอป (โหมดครู > เชื่อมต่อระบบเก็บผล)
 */

const FOLDER_ID   = '1lxEJTCQTsVbe6EJhdpo8Js_ve7WZsOaq';   // โฟลเดอร์ "เก็บไฟล์นิทานพูดได้"
const TEACHER_PIN = '2569';                                  // ← เปลี่ยนเป็นรหัสครู
const SHEET_NAME  = 'นิทานพูดได้ - ข้อมูลผลการอ่าน';

const TABS = {
  roster:   ['ห้อง', 'เลขที่', 'ชื่อ-สกุล', 'ชื่อเล่น', 'รหัส 4 ตัว'],
  results:  ['เวลา', 'รหัสนักเรียน', 'ห้อง', 'เลขที่', 'ชื่อ', 'โหมด', 'นิทาน', 'รหัสนิทาน', 'ด่าน', 'จำนวนคำ', 'อ่านถูกเอง', 'อ่านได้เมื่อช่วย', 'ข้าม', 'อ่านผิด(ครั้ง)', 'เวลาอ่าน(วินาที)', 'คำต่อนาที', 'ดาว', 'คะแนน', 'คำที่สะดุด', 'ตรวจเสียง', 'ลิงก์เสียง', 'รายละเอียด'],
  progress: ['รหัสนักเรียน', 'รหัสนิทาน', 'ด่าน', 'ดาว', 'อัปเดต'],
  words:    ['รหัสนักเรียน', 'คำ', 'สะดุด(ครั้ง)', 'อ่านได้ภายหลัง(ครั้ง)', 'ล่าสุด'],
  voices:   ['รหัสนักเรียน', 'ชื่อ', 'ระดับเสียง F0 (Hz)', 'ความแหลมเสียง', 'จำนวนตัวอย่าง', 'ลิงก์เสียงลงทะเบียน', 'อัปเดต'],
  library:  ['รหัสนิทาน', 'ชื่อเรื่อง', 'จำนวนด่าน', 'ระดับ', 'ไฟล์', 'ภาพปก(ย่อ)', 'อัปเดต', 'ผู้เพิ่ม']
};
const TAB_TITLES = { roster: 'รายชื่อนักเรียน', results: 'ผลการอ่าน', progress: 'ความก้าวหน้า', words: 'คำที่ยังอ่านไม่ได้', voices: 'เสียงลงทะเบียน', library: 'คลังนิทาน' };

/* ---------- setup ---------- */
function setup() {
  const props = PropertiesService.getScriptProperties();
  const folder = DriveApp.getFolderById(FOLDER_ID);
  let ssId = props.getProperty('SS_ID'), ss = null;
  if (ssId) { try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    props.setProperty('SS_ID', ss.getId());
  }
  Object.keys(TABS).forEach(k => {
    let sh = ss.getSheetByName(TAB_TITLES[k]);
    if (!sh) sh = ss.insertSheet(TAB_TITLES[k]);
    if (sh.getLastRow() === 0) {
      sh.appendRow(TABS[k]);
      sh.getRange(1, 1, 1, TABS[k].length).setFontWeight('bold').setBackground('#e7f6f3');
      sh.setFrozenRows(1);
    }
  });
  const first = ss.getSheets()[0];
  if (first.getName() !== TAB_TITLES.roster && first.getLastRow() === 0 && ss.getSheets().length > Object.keys(TABS).length) ss.deleteSheet(first);
  const roster = ss.getSheetByName(TAB_TITLES.roster);
  if (roster.getLastRow() === 1) {
    roster.getRange(2, 1, 3, 5).setValues([
      ['ป.1/1', 1, 'เด็กชายตัวอย่าง ใจดี', 'ต้นกล้า', '1111'],
      ['ป.1/1', 2, 'เด็กหญิงตัวอย่าง รักอ่าน', 'น้ำใส', '2222'],
      ['ป.1/2', 1, 'เด็กชายทดลอง เก่งมาก', 'ภูมิ', '3333']
    ]);
    roster.getRange('E:E').setNumberFormat('@');
  }
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid());
  ['เสียงนักเรียน', 'คลังนิทาน'].forEach(n => subFolder_(n));
  Logger.log('พร้อมใช้งาน: ' + ss.getUrl());
}

/* ---------- web endpoints ---------- */
function doGet(e) { return out_({ ok: true, app: 'talking-storybook', version: 1 }); }

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out_({ ok: false, error: 'bad_json' }); }
  try {
    const fn = ACTIONS[req.action];
    if (!fn) return out_({ ok: false, error: 'unknown_action' });
    return out_(fn(req));
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

const ACTIONS = {
  ping: () => ({ ok: true }),

  teacher_check: (q) => { teacher_(q); return { ok: true }; },

  roster: () => {
    const rows = rows_('roster');
    const rooms = {};
    rows.forEach(r => {
      const room = String(r[0]).trim(); if (!room || !r[2]) return;
      (rooms[room] = rooms[room] || []).push({ no: Number(r[1]) || r[1], name: String(r[2]), nick: String(r[3] || '') });
    });
    Object.keys(rooms).forEach(k => rooms[k].sort((a, b) => a.no - b.no));
    return { ok: true, rooms: rooms };
  },

  login: (q) => {
    const st = findStudent_(q.room, q.no);
    if (!st || String(st.pin).trim() !== String(q.pin).trim()) return { ok: false, error: 'wrong_pin' };
    const id = st.id;
    return { ok: true, student: { id: id, room: st.room, no: st.no, name: st.name, nick: st.nick }, token: token_(id),
             voice: voiceOf_(id), progress: progressOf_(id), hardWords: wordsOf_(id) };
  },

  enroll: (q) => {
    const id = auth_(q);
    let link = '';
    if (q.clip) link = saveClip_(q.clip, q.mime, id, 'ลงทะเบียน');
    withLock_(() => {
      const sh = sheet_('voices'), data = sh.getDataRange().getValues();
      const row = [id, q.name || '', Number(q.f0) || '', Number(q.centroid) || '', Number(q.n) || 0, link, new Date()];
      for (let i = 1; i < data.length; i++) if (String(data[i][0]) === id) { sh.getRange(i + 1, 1, 1, row.length).setValues([row]); return; }
      sh.appendRow(row);
    });
    return { ok: true, link: link };
  },

  log: (q) => {
    const id = auth_(q), r = q.rec || {};
    let link = '';
    if (q.clip) link = saveClip_(q.clip, q.mime, id, r.title || 'ตรวจเสียง');
    withLock_(() => {
      sheet_('results').appendRow([new Date(r.time || Date.now()), id, r.room || '', r.no || '', r.name || '', r.mode || 'story', r.title || '', r.bookId || '',
        r.stage === undefined ? '' : r.stage, r.words || 0, r.correct || 0, r.helped || 0, r.skipped || 0, r.wrongs || 0,
        r.seconds || 0, r.wpm || 0, r.stars || 0, r.score || 0, (r.hardWords || []).join(' '), r.voiceFlag || '', link, r.detail ? JSON.stringify(r.detail) : '']);
      if (r.mode === 'story' && r.bookId && r.stage !== undefined && r.stars) upsertProgress_(id, r.bookId, r.stage, r.stars);
      if (r.hardWords && r.hardWords.length) bumpWords_(id, r.hardWords, 'miss');
      if (r.learnedWords && r.learnedWords.length) bumpWords_(id, r.learnedWords, 'learned');
    });
    return { ok: true, link: link };
  },

  library_list: () => {
    const rows = rows_('library');
    return { ok: true, books: rows.filter(r => r[0]).map(r => ({ id: String(r[0]), title: String(r[1]), pages: Number(r[2]) || 0, level: String(r[3] || ''), thumb: String(r[5] || ''), updated: r[6] ? new Date(r[6]).getTime() : 0, by: String(r[7] || '') })) };
  },

  library_get: (q) => {
    const rows = rows_('library');
    const r = rows.find(x => String(x[0]) === String(q.id));
    if (!r) return { ok: false, error: 'not_found' };
    return { ok: true, book: JSON.parse(DriveApp.getFileById(String(r[4])).getBlob().getDataAsString('UTF-8')) };
  },

  library_put: (q) => {
    teacher_(q);
    const b = q.book; if (!b || !b.id || !b.title || !b.pages) throw new Error('bad_book');
    const folder = subFolder_('คลังนิทาน');
    const blob = Utilities.newBlob(JSON.stringify(b), 'application/json', b.title + '.json');
    withLock_(() => {
      const sh = sheet_('library'), data = sh.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(b.id)) {
        try { DriveApp.getFileById(String(data[i][4])).setTrashed(true); } catch (e) {}
        const f = folder.createFile(blob);
        sh.getRange(i + 1, 1, 1, 8).setValues([[b.id, b.title, b.pages.length, q.level || '', f.getId(), q.thumb || '', new Date(), q.by || 'ครู']]);
        return;
      }
      const f = folder.createFile(blob);
      sh.appendRow([b.id, b.title, b.pages.length, q.level || '', f.getId(), q.thumb || '', new Date(), q.by || 'ครู']);
    });
    return { ok: true };
  },

  library_del: (q) => {
    teacher_(q);
    withLock_(() => {
      const sh = sheet_('library'), data = sh.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) if (String(data[i][0]) === String(q.id)) {
        try { DriveApp.getFileById(String(data[i][4])).setTrashed(true); } catch (e) {}
        sh.deleteRow(i + 1);
      }
    });
    return { ok: true };
  },

  dashboard: (q) => {
    teacher_(q);
    const roster = rows_('roster').filter(r => r[0] && r[2]).map(r => ({ id: sid_(r[0], r[1]), room: String(r[0]).trim(), no: Number(r[1]) || r[1], name: String(r[2]), nick: String(r[3] || '') }));
    const res = rows_('results');
    const recent = res.slice(-3000).map(r => ({ time: r[0] ? new Date(r[0]).getTime() : 0, id: String(r[1]), mode: r[5], title: r[6], bookId: r[7], stage: r[8], words: r[9], correct: r[10], helped: r[11], skipped: r[12], wrongs: r[13], seconds: r[14], wpm: r[15], stars: r[16], score: r[17], hard: r[18], flag: r[19], link: r[20], detail: r[21] }));
    const words = rows_('words').map(r => ({ id: String(r[0]), w: String(r[1]), miss: Number(r[2]) || 0, learned: Number(r[3]) || 0 }));
    const voices = rows_('voices').map(r => ({ id: String(r[0]), f0: r[2], link: r[5] }));
    return { ok: true, roster: roster, results: recent, words: words, voices: voices, sheetUrl: ss_().getUrl() };
  }
};

/* ---------- helpers ---------- */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  if (!id) throw new Error('not_setup');
  return SpreadsheetApp.openById(id);
}
function sheet_(k) { return ss_().getSheetByName(TAB_TITLES[k]); }
function rows_(k) { const v = sheet_(k).getDataRange().getValues(); v.shift(); return v; }
function sid_(room, no) { return String(room).trim() + '-' + String(no).trim(); }
function findStudent_(room, no) {
  const r = rows_('roster').find(x => String(x[0]).trim() === String(room).trim() && String(x[1]).trim() === String(no).trim());
  return r ? { id: sid_(r[0], r[1]), room: String(r[0]).trim(), no: r[1], name: String(r[2]), nick: String(r[3] || ''), pin: String(r[4]) } : null;
}
function token_(id) {
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET') || 'x';
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(id, secret)).slice(0, 24);
}
function auth_(q) { if (!q.id || q.token !== token_(q.id)) throw new Error('not_logged_in'); return q.id; }
function teacher_(q) { if (String(q.pin) !== String(TEACHER_PIN)) throw new Error('wrong_teacher_pin'); }
function withLock_(fn) { const l = LockService.getScriptLock(); l.waitLock(20000); try { fn(); } finally { l.releaseLock(); } }
function subFolder_(name) {
  const root = DriveApp.getFolderById(FOLDER_ID), it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
function saveClip_(b64, mime, id, label) {
  const room = id.split('-').slice(0, -1).join('-') || 'อื่นๆ';
  const parent = subFolder_('เสียงนักเรียน'), it = parent.getFoldersByName(room);
  const dir = it.hasNext() ? it.next() : parent.createFolder(room);
  const ext = /mp4|aac/.test(mime || '') ? 'm4a' : /ogg/.test(mime || '') ? 'ogg' : 'webm';
  const stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HHmmss');
  const f = dir.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime || 'audio/webm', id + ' ' + label + ' ' + stamp + '.' + ext));
  return f.getUrl();
}
function voiceOf_(id) {
  const r = rows_('voices').find(x => String(x[0]) === id);
  return r ? { f0: Number(r[2]) || 0, centroid: Number(r[3]) || 0, n: Number(r[4]) || 0 } : null;
}
function progressOf_(id) {
  const p = {};
  rows_('progress').forEach(r => { if (String(r[0]) !== id) return; const b = String(r[1]); (p[b] = p[b] || {})[r[2]] = Number(r[3]) || 0; });
  return p;
}
function wordsOf_(id) { return rows_('words').filter(r => String(r[0]) === id).map(r => ({ w: String(r[1]), miss: Number(r[2]) || 0, learned: Number(r[3]) || 0 })); }
function upsertProgress_(id, bookId, stage, stars) {
  const sh = sheet_('progress'), data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (String(data[i][0]) === id && String(data[i][1]) === String(bookId) && String(data[i][2]) === String(stage)) {
    if (Number(stars) > Number(data[i][3])) sh.getRange(i + 1, 4, 1, 2).setValues([[stars, new Date()]]);
    return;
  }
  sh.appendRow([id, bookId, stage, stars, new Date()]);
}
function bumpWords_(id, list, kind) {
  const sh = sheet_('words'), data = sh.getDataRange().getValues(), idx = {};
  for (let i = 1; i < data.length; i++) if (String(data[i][0]) === id) idx[String(data[i][1])] = i + 1;
  list.forEach(w => {
    w = String(w); const row = idx[w];
    if (row) {
      const col = kind === 'miss' ? 3 : 4;
      sh.getRange(row, col).setValue((Number(sh.getRange(row, col).getValue()) || 0) + 1);
      sh.getRange(row, 5).setValue(new Date());
    } else if (kind === 'miss') { sh.appendRow([id, w, 1, 0, new Date()]); idx[w] = sh.getLastRow(); }
  });
}
