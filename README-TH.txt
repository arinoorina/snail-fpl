SNAIL FPL — v5.12 FINAL · SHARED VERCEL CACHE 20 DAYS


เป้าหมายของเวอร์ชันนี้
- คนแรกที่เรียก /api/fpl หลัง Cache ว่าง จะเป็นคนดึงข้อมูลจาก Google Apps Script / Google Sheet
- หลังจากนั้นผู้ใช้คนอื่นจะได้ข้อมูลจาก Vercel CDN Shared Cache แทน เป็นเวลา 20 วัน
- หน้าเว็บหลัก / และ /index.html กำหนด Shared CDN Cache 20 วันเช่นกัน
- Browser ไม่ถือ league data ยาว 20 วันเอง จึงยังสามารถ purge ที่ Vercel เพื่อบังคับอัปเดตข้อมูลได้
- เริ่ม request /api/fpl ตั้งแต่ <head> เพื่อให้การโหลดข้อมูลซ้อนกับการ parse หน้าเว็บ ลดเวลาที่เห็น LOADING
- ไม่เปลี่ยน UI / Table / Gameweek / History / Stats / Recap / Team Profile

CACHE POLICY
- API /api/fpl: 1,728,000 วินาที = 20 วัน (Vercel CDN shared cache)
- หน้า / และ /index.html: 1,728,000 วินาที = 20 วัน (Vercel CDN shared cache)
- stale-while-revalidate: 1 วัน
- stale-if-error: 20 วัน สำหรับ API เพื่อให้มีโอกาสเสิร์ฟข้อมูล cached เดิมเมื่อ upstream มีปัญหา
- Icons: 1 ปี (immutable)
- sw.js: no-cache เพื่อให้ Service Worker อัปเดตได้

หลัง Deploy
1. เปิด https://snail-fpl.vercel.app/api/fpl ครั้งแรก — อาจเป็น MISS และช้ากว่าปกติ เพราะต้องไป Apps Script
2. Refresh / เปิดอีกเครื่อง — response ควรเร็วขึ้น และ Vercel จะเสิร์ฟ shared cached response
3. ตรวจ response header ใน Browser DevTools > Network > /api/fpl
   มองหา x-vercel-cache: HIT (หรือสถานะ cache ของ Vercel ที่เทียบเท่า)
   และ X-Snail-Cache-Policy: shared-cdn-20d

เมื่อแก้คะแนนใน Google Sheet
- ไป Vercel > Project snail-fpl > CDN > Caches
- Invalidate/Purge Cache Tag: snail-fpl-data
- Request ถัดไปจะทำให้ข้อมูลใหม่ถูกนำเข้ามาใน shared cache

ถ้าแก้หน้าเว็บ/UI
- Deploy เวอร์ชันใหม่ตามปกติ
- ถ้าต้องการบังคับล้าง shell cache ให้ purge tag: snail-fpl-shell

แผนสำรอง
- Google Apps Script /exec เดิมยังคงใช้งานได้ และ index.html ยังคงรองรับ google.script.run เหมือนเดิม
