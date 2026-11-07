# Ashfall Online

เกม MMO 2D แบบพิกเซล เล่นบนเบราว์เซอร์ พร้อมเซิร์ฟเวอร์ Node.js สำหรับเล่นออนไลน์หลายคน

- `public/`: ตัวเกมทั้งหมด (HTML/JS/รูป)
- `server/server.js`: เซิร์ฟเวอร์ ทำหน้าที่ 2 อย่าง
  - เสิร์ฟหน้าเกม
  - ระบบออนไลน์ผ่าน WebSocket (`/ws`)
- ในเกมมี 4 เซิร์ฟเวอร์ (Aurelion-1, Aurelion-2, Solaris, Umbra) ผู้เล่นเซิร์ฟเดียวกันและแมพเดียวกันจะเห็นกันและแชทกันได้
- แต่ละแมพแยกเป็น **แชนแนล** อัตโนมัติ แชนแนลละไม่เกิน 60 คน (ปรับได้) ถ้าคนเต็มจะเปิดแชนแนลใหม่ให้เอง

---

## เปิดเซิร์ฟเวอร์บน Oracle Cloud Always Free (ฟรีถาวร)

### 1) สร้างเครื่อง (VM)
1. สมัคร https://www.oracle.com/cloud/free/ (ต้องใช้บัตรยืนยันตัวตน แต่ไม่ตัดเงินถ้าใช้แค่ Always Free)
2. เข้า **Compute → Instances → Create instance**
   - **Image:** Ubuntu 22.04 (หรือ 24.04)
   - **Shape:** `VM.Standard.A1.Flex` (ARM) ใส่ 2–4 OCPU และ RAM 12–24 GB ได้ฟรี ถ้าเต็ม ใช้ `VM.Standard.E2.1.Micro` แทน
   - กด **Save private key** เก็บไฟล์คีย์ SSH ไว้
3. จดหมายเลข **Public IP** ของเครื่อง

### 2) เปิดพอร์ต
1. ที่ Oracle Cloud ไปที่ **Networking → Virtual Cloud Networks → (VCN ของคุณ) → Security Lists → Default** แล้วกด **Add Ingress Rules**
   - Source CIDR: `0.0.0.0/0` · TCP · Destination port: `80`
   - ทำซ้ำกับพอร์ต `443` และ `8080`
2. SSH เข้าเครื่อง แล้วเปิดไฟร์วอลล์ในเครื่อง:
   ```bash
   ssh -i คีย์ของคุณ.key ubuntu@IP_ของเครื่อง
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
   sudo apt-get update && sudo apt-get install -y iptables-persistent && sudo netfilter-persistent save
   ```

### 3) ติดตั้ง Node.js และตัวเกม
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
git clone https://github.com/phuthanet9870-cpu/Ashfall-Online.git
cd Ashfall-Online
npm install
```

### 4) ทดลองรัน
```bash
PORT=8080 node server/server.js
```
เปิดเบราว์เซอร์ไปที่ `http://IP_ของเครื่อง:8080` แล้วให้เพื่อนเปิดลิงก์เดียวกัน คนที่อยู่เซิร์ฟเดียวกันและแมพเดียวกันจะเห็นกัน เสร็จแล้วกด `Ctrl+C` เพื่อหยุด

### 5) ให้เซิร์ฟเวอร์รันตลอด 24 ชม. (ปิด SSH แล้วยังทำงาน และรีสตาร์ทเครื่องแล้วเปิดเอง)
```bash
sudo npm install -g pm2
PORT=8080 pm2 start server/server.js --name ashfall
pm2 save
pm2 startup
```
พิมพ์คำสั่งที่ `pm2 startup` แสดงขึ้นมาอีกครั้ง

**คำสั่งที่ใช้บ่อย:**

| ต้องการ | คำสั่ง |
|---|---|
| ดูสถานะ | `pm2 status` |
| ดู log | `pm2 logs ashfall` |
| รีสตาร์ท | `pm2 restart ashfall` |

### 6) ใช้โดเมนและ HTTPS (แนะนำ ทำหรือไม่ก็ได้)
ถ้ามีโดเมน ให้ชี้ A record ไปที่ IP ของเครื่อง แล้วติดตั้ง Caddy ซึ่งออกใบรับรอง HTTPS ให้อัตโนมัติ:
```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
echo 'เกมของคุณ.com {
  reverse_proxy localhost:8080
}' | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
จากนั้นเข้าเล่นที่ `https://เกมของคุณ.com` ได้เลย WebSocket จะใช้ `wss://` ให้อัตโนมัติ

ถ้ายังไม่มีโดเมน แต่อยากให้เข้าทางพอร์ต 80 (`http://IP`) ให้ใช้ Caddyfile แบบนี้แทน:
```
:80 {
  reverse_proxy localhost:8080
}
```

### 7) อัปเดตเกมเวอร์ชันใหม่
```bash
cd ~/Ashfall-Online && git pull && npm install && pm2 restart ashfall
```

---

## ตั้งค่าเซิร์ฟเวอร์ (Environment variables)

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `PORT` | 8080 | พอร์ตของเซิร์ฟเวอร์ |
| `ROOM_CAP` | 60 | จำนวนคนสูงสุดต่อแชนแนล (ต่อแมพ) |
| `LOBBY_PER_SERVER` | 200 | จำนวนรายชื่อในหน้าผู้เล่นออนไลน์ต่อเซิร์ฟ |
| `MAX_CLIENTS` | 3000 | จำนวนการเชื่อมต่อสูงสุดทั้งเซิร์ฟเวอร์ |

ตัวอย่าง: `ROOM_CAP=40 PORT=8080 pm2 start server/server.js --name ashfall`

เช็คสถานะเซิร์ฟเวอร์ได้ที่ `http://IP:8080/health` จะแสดงจำนวนคนออนไลน์และจำนวนห้อง

## ข้อควรรู้
- ข้อมูลตัวละคร (เซฟ) ยังเก็บในเบราว์เซอร์ของผู้เล่นแต่ละคน เปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์แล้วเซฟจะไม่ตามไป และผู้เล่นแก้เซฟของตัวเองได้ ถ้าต้องการบัญชีและเซฟบนเซิร์ฟเวอร์ (กันโกง) ต้องเพิ่มฐานข้อมูลภายหลัง
- ตอนนี้ระบบออนไลน์ซิงก์ตำแหน่ง ท่าทาง เลเวล ปีก และแชทของผู้เล่นจริง ส่วนการต่อสู้ มอนสเตอร์ และดรอปยังคำนวณในเครื่องของแต่ละคน
- ถ้าเปิดเกมใน claude.ai ระบบจะใช้ห้องออนไลน์ของ claude.ai แทน ไฟล์ `public/js/netshim.js` จะทำงานเฉพาะตอนเปิดจากเว็บของคุณเอง
