SNAIL FPL — วิธี Deploy แบบง่าย

ไฟล์: DEPLOY_TO_VERCEL.bat

ครั้งแรกบนคอมเครื่องนี้:
1) ต้องมี Node.js LTS อยู่ในเครื่อง
2) ดับเบิลคลิก DEPLOY_TO_VERCEL.bat
3) ถ้า Vercel ให้ Login ให้ Login บัญชีเดิม
4) ตอนถาม Project ให้เลือก "Link to existing project"
5) เลือก Project เดิมของ SNAIL FPL (snail-fpl)
6) รอจนขึ้น DEPLOY COMPLETE

ครั้งต่อไป:
- ดับเบิลคลิก DEPLOY_TO_VERCEL.bat อย่างเดียว
- จะ Deploy ทับ Production Project เดิม

ข้อควรระวัง:
- ครั้งแรกต้องเลือก EXISTING PROJECT เท่านั้น เพื่อไม่ให้สร้าง Project ใหม่
- ถ้า Deploy ล้มเหลว Production เดิมจะยังอยู่
