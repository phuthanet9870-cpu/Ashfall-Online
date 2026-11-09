# Ashfall Online

เกม MMO 2D พิกเซล เล่นบนเบราว์เซอร์ ทำออนไลน์ได้ **ฟรี** ด้วยเครื่องมือ 3 อย่าง:

| เครื่องมือ | ใช้ทำอะไร |
|---|---|
| **Cloudflare Workers** | เซิร์ฟเวอร์ออนไลน์: ห้อง/แชนแนล แชท รายชื่อเพื่อน กิลด์ |
| **itch.io** (หรือ GitHub Pages) | หน้าเว็บให้คนเข้าเล่น |
| **GitHub** | เก็บโค้ด และ deploy ขึ้น Cloudflare ให้อัตโนมัติ |

ไม่ต้องใช้ Firebase และไม่ต้องผูกบัตรกับ Google Cloud

## ระบบในเวอร์ชันออนไลน์
- ระบบเกมยังอยู่ครบทุกอย่าง
- **ไม่มีบอทผู้เล่นปลอม** ในเมืองและแมพฟาร์ม คนที่เห็นคือผู้เล่นจริงทั้งหมด ส่วน PvP กิลด์วอร์ และบอสโลกยังมีทีม AI เพื่อให้โหมดเหล่านี้เล่นได้
- **ระบบเพื่อน** (เมนู → เพื่อน)
  - ส่ง ตอบรับ หรือปฏิเสธคำขอเป็นเพื่อน
  - ดูว่าเพื่อนออนไลน์อยู่เซิร์ฟไหน แมพไหน
  - กระซิบหาเพื่อน หรือพิมพ์ `/w ชื่อ ข้อความ` ในแชท
  - คลิกผู้เล่นจริงในแมพเพื่อเพิ่มเพื่อนได้
- **ระบบขอเข้ากิลด์** (เมนู → กิลด์)
  - สร้างกิลด์ ค้นหากิลด์ แล้วกด "ขอเข้ากิลด์"
  - หัวหน้าหรือรองหัวหน้ากดรับเข้าหรือปฏิเสธ
  - แท็บ "สมาชิกออนไลน์" ดูสถานะสมาชิก ตั้งรอง นำออก และแชทกิลด์ (หรือพิมพ์ `/g ข้อความ`)
- 4 เซิร์ฟเวอร์ในเกม และแต่ละแมพแบ่งแชนแนลอัตโนมัติ แชนแนลละ 60 คน

---

## ขั้นที่ 1: Deploy เซิร์ฟเวอร์ขึ้น Cloudflare Workers (ผ่าน GitHub อัตโนมัติ)
1. สมัคร/ล็อกอิน https://dash.cloudflare.com (ฟรี ไม่ต้องใช้บัตร)
2. หา **Account ID**: หน้า Dashboard → Workers & Pages → ดูที่แถบขวา "Account ID" แล้วคัดลอกไว้
3. สร้าง **API Token**: มุมขวาบน รูปโปรไฟล์ → My Profile → API Tokens → **Create Token** → เลือกเทมเพลต **"Edit Cloudflare Workers"** → Continue → Create แล้วคัดลอก token ไว้
   (token นี้เป็นความลับ ห้ามแปะในแชทหรือในโค้ด)
4. ที่ GitHub ของรีโปนี้ไปที่ **Settings → Secrets and variables → Actions → New repository secret** แล้วเพิ่ม 2 ตัว:
   - `CLOUDFLARE_API_TOKEN` = token จากข้อ 3
   - `CLOUDFLARE_ACCOUNT_ID` = Account ID จากข้อ 2
5. ไปที่แท็บ **Actions → Deploy Cloudflare Worker → Run workflow**
6. เสร็จแล้วจะได้ที่อยู่ประมาณ `https://ashfall-online.ชื่อของคุณ.workers.dev`
   - ดูได้ใน log ของ Action หรือใน Cloudflare → Workers & Pages
   - เปิด `https://ashfall-online.ชื่อของคุณ.workers.dev/health` ถ้าขึ้น `{"ok":true,...}` แปลว่าใช้ได้

## ขั้นที่ 2: บอกเกมว่าเซิร์ฟเวอร์อยู่ที่ไหน
แก้ไฟล์ `public/js/config.js` ผ่านหน้าเว็บ GitHub ได้เลย (กดไอคอนดินสอ):
```js
ws: 'wss://ashfall-online.ชื่อของคุณ.workers.dev/ws',
```
แล้วกด Commit

## ขั้นที่ 3: ลงเกมบน itch.io
1. ไปที่แท็บ **Actions → Build itch.io zip** (รันเองอัตโนมัติหลัง commit ข้อ 2) → เปิดรายการล่าสุด → ดาวน์โหลด **ashfall-itch** (ได้ไฟล์ zip) แล้วแตก zip ชั้นนอกออก จะได้ `ashfall-itch.zip`
2. ที่ itch.io → **Upload new project**
   - Kind of project: **HTML**
   - Uploads: เลือก `ashfall-itch.zip` แล้วติ๊ก **This file will be played in the browser**
   - Embed options: ขนาด 1280 × 720, ติ๊ก **Fullscreen button** และ **Mobile friendly**
3. Save แล้วตั้ง Visibility เป็น **Public** เพื่อแชร์ลิงก์ให้เพื่อนเล่น

**ทางเลือก GitHub Pages:**
1. Settings → Pages → Source เลือก **GitHub Actions**
2. Actions → **Publish game on GitHub Pages** → Run workflow
3. จะได้ลิงก์ `https://ชื่อคุณ.github.io/ashfall-online/`

## อัปเดตเกม
แก้ไฟล์ใน `public/` แล้ว commit จากนั้น
- Action จะสร้าง zip ใหม่ให้ เอาไปอัปโหลดแทนไฟล์เดิมบน itch.io
- ถ้าแก้เซิร์ฟเวอร์ (`worker/` หรือ `server/core.mjs`) Worker จะ deploy ใหม่ให้เอง

---

## ฟรีแค่ไหน (Cloudflare Workers Free)
- เซิร์ฟเวอร์ทั้งหมดรันใน Durable Object ตัวเดียว เพื่อให้อยู่ในโควต้าฟรี
- โควต้าฟรีจำกัดจำนวนคำขอต่อวัน เกมนี้ลดการส่งข้อมูลแล้ว (ส่งเฉพาะตอนมีการเปลี่ยนแปลง สูงสุดประมาณ 6 ครั้งต่อวินาที) เหมาะกับผู้เล่นหลักสิบคน
- ถ้าคนเยอะจนเกินโควต้า ให้เปลี่ยนไปใช้แพ็กเกจ Workers Paid (ประมาณเดือนละ 5 ดอลลาร์) หรือใช้เซิร์ฟเวอร์ Node ด้านล่าง
- เช็คโควต้าที่ใช้ไปได้ที่ Cloudflare → Workers & Pages → ashfall-online → Metrics (ตัวเลขลิมิตของ Cloudflare อาจเปลี่ยน ให้ดูหน้าราคาของ Cloudflare ประกอบ)

## ทางเลือก: รันบน VPS หรือคอมพิวเตอร์ของตัวเอง (Node.js)
```bash
npm install
PORT=8080 npm start
```
เปิด `http://IP:8080` ได้เลย ตัวเกมกับระบบออนไลน์อยู่ในเครื่องเดียวกัน (ไม่ต้องแก้ config.js) ข้อมูลเพื่อนและกิลด์เก็บที่ `data/store.json`
ใช้ pm2 ให้รันตลอด: `npm i -g pm2 && pm2 start server/server.mjs --name ashfall && pm2 save && pm2 startup`

## ข้อควรรู้
- เซฟตัวละครเก็บในเบราว์เซอร์ของผู้เล่น ส่วนรายชื่อเพื่อนกับกิลด์เก็บบนเซิร์ฟเวอร์ โดยผูกกับรหัสผู้เล่นที่สร้างอัตโนมัติในเบราว์เซอร์นั้น ถ้าล้างข้อมูลเบราว์เซอร์จะกลายเป็นผู้เล่นใหม่
- ตอนนี้ระบบออนไลน์ซิงก์ตำแหน่ง ท่าทาง เลเวล ปีก แชท เพื่อน และกิลด์ ส่วนการต่อสู้และดรอปยังคำนวณในเครื่องของแต่ละคน
- เปิดใน claude.ai จะใช้ระบบห้องออนไลน์ของ claude.ai แทน (ไม่มีเพื่อนหรือกิลด์ออนไลน์)
