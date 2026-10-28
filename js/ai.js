/* นิทานพูดได้ — AI story maker (Gemini): write a short story around the words a class needs to practise,
   with comprehension questions and optional illustrations. The teacher always reviews it in the editor. */
'use strict';

addOverlay('aiModal', `<div class="big-modal"><div class="card" style="text-align:left">
  <h3>สร้างนิทานด้วย AI</h3>
  <p class="login-sub">AI แต่งนิทานสั้นจากคำที่อยากให้นักเรียนฝึก แล้วเปิดในหน้าแก้ไขให้ครูตรวจก่อนบันทึก ใช้ Gemini API key เดียวกับการอ่านตัวหนังสือจากภาพ</p>
  <label class="f" for="aiTopic">เรื่องเกี่ยวกับ<input type="text" id="aiTopic" placeholder="เช่น ช้างน้อยหลงป่า, การรักษาความสะอาด"></label>
  <label class="f" for="aiWords">คำที่อยากให้ฝึก <small>คั่นด้วยเว้นวรรค เช่น คำในมาตรา แม่กน</small><input type="text" id="aiWords" placeholder="กิน บิน ฝน ต้น ดิน"></label>
  <div class="prow">
    <label class="f" for="aiGrade" style="flex:1">ระดับชั้น<select id="aiGrade"><option>ป.1</option><option>ป.2</option><option>ป.3</option></select></label>
    <label class="f" for="aiPages" style="flex:1">จำนวนด่าน (หน้า)<select id="aiPages"><option>3</option><option selected>4</option><option>5</option><option>6</option><option>8</option></select></label>
  </div>
  <label class="opt" for="aiImg" style="display:flex;gap:8px"><input type="checkbox" id="aiImg" checked><span>สร้างภาพประกอบด้วย AI <small class="login-sub">(ใช้เวลาเพิ่มหน้าละประมาณ 10 วินาที)</small></span></label>
  <label class="f" for="aiImgModel">โมเดลภาพ <small>เปลี่ยนได้ถ้า Google ออกรุ่นใหม่</small><input type="text" id="aiImgModel" spellcheck="false"></label>
  <div class="ocrst" id="aiStatus"></div>
  <div class="prow" style="justify-content:flex-end"><button class="btn ghost" id="aiCancel">ปิด</button><button class="btn primary" id="aiGo">${ICON.spark}แต่งนิทาน</button></div>
</div></div>`);

(function aiButton() {
  const b = document.createElement('button');
  b.className = 'btn'; b.id = 'btnAI'; b.innerHTML = ICON.spark + 'สร้างนิทานด้วย AI';
  $('#btnNew').after(b);
  b.onclick = () => { $('#aiImgModel').value = lsGet('tsb-imgmodel', 'gemini-2.5-flash-image'); $('#aiStatus').textContent = ''; $('#aiModal').hidden = false; };
  $('#aiCancel').onclick = () => { aiAbort = true; $('#aiModal').hidden = true; };
  $('#aiImgModel').onchange = e => lsSet('tsb-imgmodel', e.target.value.trim() || 'gemini-2.5-flash-image');
})();

let aiAbort = false;
async function gemini(model, body) {
  const key = ocrCfg().key.trim();
  if (!key) throw new Error('nokey');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status === 429 ? 'quota' : r.status === 400 || r.status === 403 ? 'key' : r.status === 404 ? 'model' : 'net');
  return r.json();
}
async function aiStory(topic, words, grade, pages) {
  const prompt = `แต่งนิทานภาษาไทยสำหรับนักเรียนชั้น ${grade} ที่กำลังฝึกอ่าน
หัวเรื่อง: ${topic || 'เลือกเรื่องที่เด็กชอบ'}
คำที่ต้องใช้ในเรื่อง (ใช้ทุกคำ อย่างน้อยคำละ 1 ครั้ง): ${words || '-'}
ข้อกำหนด:
- มี ${pages} หน้า แต่ละหน้า ${grade === 'ป.1' ? '1-2 ประโยคสั้น ประโยคละไม่เกิน 6 คำ' : grade === 'ป.2' ? '2-3 ประโยค' : '3-4 ประโยค'}
- ใช้คำง่ายระดับ ${grade} สะกดถูกต้องตามพจนานุกรม เว้นวรรคระหว่างคำ ขึ้นบรรทัดใหม่ทุกประโยค
- มีตัวละครหลักเดิมตลอดเรื่อง มีข้อคิดดี ๆ ตอนจบ ไม่มีความรุนแรง
- ทุกหน้ามีคำบรรยายภาพเป็นภาษาอังกฤษสำหรับวาดภาพประกอบ (บรรยายตัวละครหลักแบบเดียวกันทุกหน้า)
- คำถามอ่านรู้เรื่อง 3 ข้อ ข้อละ 3 ตัวเลือก
ตอบเป็น JSON เท่านั้น รูปแบบ:
{"title":"ชื่อเรื่อง","character":"English description of the main character","pages":[{"text":"ข้อความหน้า","image":"English scene description"}],"questions":[{"q":"คำถาม","choices":["ก","ข","ค"],"answer":0}]}`;
  const j = await gemini(ocrCfg().model || 'gemini-2.5-flash', { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } });
  const txt = (((j.candidates || [])[0] || {}).content || {}).parts.map(p => p.text || '').join('');
  const d = JSON.parse(txt.replace(/^```json|```$/g, '').trim());
  if (!d.title || !Array.isArray(d.pages) || !d.pages.length) throw new Error('bad');
  return d;
}
async function aiImage(scene, character) {
  const model = lsGet('tsb-imgmodel', 'gemini-2.5-flash-image');
  const j = await gemini(model, {
    contents: [{ parts: [{ text: `Children's picture book illustration, bright soft watercolor style, friendly and cute, simple background, absolutely no text or letters in the image. Main character: ${character}. Scene: ${scene}` }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  });
  const part = ((((j.candidates || [])[0] || {}).content || {}).parts || []).find(p => p.inlineData || p.inline_data);
  if (!part) throw new Error('noimage');
  const d = part.inlineData || part.inline_data;
  const blob = await (await fetch(`data:${d.mimeType || d.mime_type || 'image/png'};base64,${d.data}`)).blob();
  return compressImage(new File([blob], 'ai.png', { type: blob.type }));
}
// a plain coloured cover when no picture could be made
function placeholderCover(title) {
  const c = document.createElement('canvas'); c.width = 900; c.height = 1200; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 900, 1200); gr.addColorStop(0, '#18c3a5'); gr.addColorStop(1, '#8b6cf0'); g.fillStyle = gr; g.fillRect(0, 0, 900, 1200);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; g.beginPath(); g.arc(Math.random() * 900, Math.random() * 1200, 10 + Math.random() * 60, 0, 7); g.fill(); }
  g.fillStyle = '#fff'; g.font = 'bold 88px Sarabun, sans-serif'; g.textAlign = 'center';
  const words = title.split(/\s+/); let line = '', y = 560; const lines = [];
  words.forEach(w => { if (g.measureText(line + w).width > 760) { lines.push(line); line = ''; } line += w + ' '; }); lines.push(line);
  lines.forEach((l, i) => g.fillText(l.trim(), 450, y + i * 110 - (lines.length - 1) * 55));
  return c.toDataURL('image/jpeg', 0.85);
}
const AI_ERR = { nokey: 'ยังไม่มี Gemini API key ใส่ได้ที่ "ตั้งค่าการอ่านตัวหนังสือจากภาพ"', quota: 'ใช้ Gemini ครบโควตาแล้ว รอสักครู่แล้วลองใหม่', key: 'Gemini ไม่รับ API key นี้', model: 'ไม่พบชื่อโมเดลนี้', net: 'เชื่อมต่อไม่ได้', bad: 'AI ตอบกลับไม่ครบ ลองกดอีกครั้ง' };

$('#aiGo').onclick = async () => {
  aiAbort = false;
  const st = $('#aiStatus'), go = $('#aiGo'); go.disabled = true;
  st.className = 'ocrst busy'; st.textContent = 'กำลังแต่งนิทาน…';
  try {
    const d = await aiStory($('#aiTopic').value.trim(), $('#aiWords').value.trim(), $('#aiGrade').value, +$('#aiPages').value);
    const pages = d.pages.map(p => ({ img: '', text: String(p.text || '').trim() }));
    let cover = '';
    if ($('#aiImg').checked) {
      for (let i = 0; i < d.pages.length && !aiAbort; i++) {
        st.textContent = `กำลังวาดภาพด่านที่ ${i + 1}/${d.pages.length}…`;
        try { pages[i].img = await aiImage(d.pages[i].image || d.title, d.character || ''); } catch (e) { if (e.message === 'quota' || e.message === 'key' || e.message === 'model') { st.textContent = 'วาดภาพไม่ได้ (' + (AI_ERR[e.message] || e.message) + ') ใช้นิทานแบบไม่มีภาพไปก่อน'; break; } }
      }
      if (!aiAbort) { st.textContent = 'กำลังวาดภาพปก…'; try { cover = await aiImage('Book cover showing the main character, joyful, inviting. Story: ' + d.title, d.character || ''); } catch (e) {} }
    }
    if (aiAbort) return;
    if (!cover) cover = pages.find(p => p.img) ? pages.find(p => p.img).img : placeholderCover(d.title);
    const qs = (d.questions || []).filter(q => q && q.q && Array.isArray(q.choices) && q.choices.length >= 2).map(q => ({ q: q.q, choices: q.choices.map(String), answer: Math.max(0, Math.min(q.choices.length - 1, +q.answer || 0)) }));
    $('#aiModal').hidden = true;
    openEditor({ title: d.title, spell: '', cover, questions: qs, pages });
    toast('AI แต่งนิทานเสร็จแล้ว ครูตรวจคำและภาพก่อนกดบันทึกนะ', 5000);
  } catch (e) {
    st.className = 'ocrst err'; st.textContent = AI_ERR[e.message] || 'สร้างนิทานไม่สำเร็จ ลองใหม่อีกครั้ง';
  } finally { go.disabled = false; }
};
