/*
html css js firebase realtime database
ทำระบบแสกนจุดออนไลน์ในโรงงาน ผู้ใช้งานจะแบ่งเป็น 2 ส่วน คือ รปภ.ทำหน้าที่ตรวจและแสกน และ จป.ทำส่วนระบบหลังบ้านเป็นหลัก(กำหนดต่างๆ)
1.กำหนดจุดตรวจ (สามารถถ่ายรูปเพื่อประกอบ cloudinary)
สร้างแล้ว gen เป็น qrcode เฉพาะ location นั้นๆ
สร้างเป็น token เฉพาะ uuid v4 เพื่อให้ scan แล้วอ้างอิงถึง location นั้นๆ
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
2.กำหนดรอบตรวจ เวลากี่โมงถึงกี่โมง input type time
3.แจ้งเตือนก่อนถึงเวลาตรวจ (สามารถกำหนดเวลาจะเตือนได้)
4.ทำบันทึกเมื่อมีเหตุฉุกเฉิน
5.แสกน qr coode
ให้ gen ใน webapp นี้ โดยใช้
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
6.หลักๆเน้นใช้งานภายใน mobile site , desktop จะเป็นใช้งานส่วนระบบหลังบ้าน(ส่วนของผู้ดูแลระบบ) แต่ใน mobile ก็ใช้ได้เหมือนกัน
7.เมื่อ scan ให้บันทึกตำแหน่ง gps แล้วแสดงบน maps โดยใช้ leaflet
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.awesome-markers/2.0.4/leaflet.awesome-markers.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.awesome-markers/2.0.4/leaflet.awesome-markers.js"></script>
8.ตกแต่งแอพให้แนวสะอาดสวยงาม

        const cloudinaryConfig = {
            cloudName: "domvtfj1i",
            uploadPreset: "testclaimdata",
            apiKey: "956358336591924",
            pid: "e2a06caa-be00-455e-9808-8a7df76618e9"
        };
        formData.append("folder", "CHECK");

        const firebaseConfig = {
        apiKey: "AIzaSyD5ZWVYevzL0Qj-H_jiVIL7WyH0vOp1kLs",
        authDomain: "test2-a3a49.firebaseapp.com",
        databaseURL: "https://test2-a3a49-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "test2-a3a49",
        storageBucket: "test2-a3a49.firebasestorage.app",
        messagingSenderId: "210722067503",
        appId: "1:210722067503:web:069f168981aa965392a2da",
        measurementId: "G-FEDYDSVGZC"
        };
9.ยังไม่ต้องทำระบบ login ให้ใช้งานได้ full function ก่อน
*/

/*
CL 
- maps OK
- mobile site css No
- notification desktop OK
- upload pic OK
- download QR OK

DS
- maps OK
- mobile site css OK
- notification desktop,Mobile OK
- upload pic OK
- download QR No

*/ 

/*
13-02
Login - OK
permission - OK
activityLog -
Dashboard -
ลบผู้บันทึกจาก admin_Guard เป็นตาม user จริงที่ทำการ login
เพิ่มหน้าแรกใหม่ - เป็นหน้าโชว์เหมือนเป็น task ที่ต้องทำ โดยแสดงเป็น card แสดงจำนวนรอบตรวจวันนี้,จำนวนจุดที่ต้องตรวจวันนี้,จำนวนจุดที่ตรวจแล้ว เพิ่มอะไรอีกช่วยคิดที

Optimizing tool selection...ไอเดียสำหรับหน้าแรก (Dashboard/Task Overview) ที่แสดงเป็น card:

1. จำนวนรอบตรวจวันนี้ (Today's Schedules)
2. จำนวนจุดที่ต้องตรวจวันนี้ (Checkpoints to Visit)
3. จำนวนจุดที่ตรวจแล้ว (Checkpoints Completed)
4. จำนวนเหตุฉุกเฉินที่เกิดวันนี้ (Emergencies Today)
5. จำนวนบันทึกการตรวจวันนี้ (Inspection Records Today)
6. สถานะผู้ใช้ (User Status: เช่น กำลังปฏิบัติงาน/ว่าง)
7. สรุปงานที่ค้าง (Pending Tasks: เช่น จุดที่ยังไม่ได้ตรวจ)
8. สถิติย้อนหลัง (เช่น รอบตรวจที่ขาด/สาย/สำเร็จ)
9. ปุ่มลัดสำหรับเริ่มแสกน/แจ้งเหตุฉุกเฉิน/เพิ่มบันทึก

แนะนำ UI:
- ใช้ card แต่ละใบแสดงข้อมูลสั้นๆ พร้อมไอคอน
- อาจมีกราฟวงกลมหรือ progress bar แสดงเปอร์เซ็นต์การตรวจ
- ปุ่ม "เริ่มงานวันนี้" หรือ "ดูรายละเอียด"

ตัวอย่าง card:
- "รอบตรวจวันนี้: 3 รอบ"
- "จุดที่ต้องตรวจ: 12 จุด"
- "ตรวจแล้ว: 7 จุด"
- "เหตุฉุกเฉิน: 1 ครั้ง"
- "บันทึกการตรวจ: 15 รายการ"

ถ้าต้องการโค้ดตัวอย่าง UI หรือ logic สำหรับดึงข้อมูลจาก Firebase แจ้งได้เลย!

*/

/*
สำหรับหน้าแรก (Dashboard) ของระบบตรวจโรงงาน คุณสามารถเพิ่มฟีเจอร์หรือข้อมูลที่มีประโยชน์ดังนี้:

1. **สรุปเหตุฉุกเฉินวันนี้**  
   - เพิ่มการแสดงจำนวนเหตุฉุกเฉินที่เกิดขึ้นวันนี้ พร้อมไอคอนและสีที่สื่อถึงความสำคัญ

2. **สรุปผู้ใช้งานออนไลน์/ล่าสุด**  
   - แสดงรายชื่อผู้ใช้งานที่เข้าสู่ระบบล่าสุด หรือจำนวนผู้ใช้งานที่ออนไลน์

3. **แจ้งเตือน/Notification ล่าสุด**  
   - แสดงรายการแจ้งเตือน เช่น จุดที่ยังไม่ตรวจ, รอบที่ใกล้หมดเวลา, เหตุฉุกเฉินที่ยังไม่ดำเนินการ

4. **แผนที่ (Mini Map)**  
   - เพิ่มแผนที่ขนาดเล็กแสดงจุดตรวจที่ต้องทำวันนี้ หรือจุดที่ตรวจแล้ว

5. **ปุ่มลัดสำหรับการเพิ่มเหตุฉุกเฉิน/ตรวจจุด**  
   - ปุ่มลัดสำหรับการเพิ่มเหตุฉุกเฉินหรือเริ่มตรวจจุดได้ทันที

6. **กราฟ/Chart สถิติ**  
   - เพิ่มกราฟแสดงสถิติ เช่น อัตราการตรวจสำเร็จ, อัตราการเกิดเหตุฉุกเฉิน, สถิติย้อนหลัง

7. **รายการจุดที่ยังไม่ตรวจ (To-do List)**  
   - แสดงรายการจุดที่ยังไม่ตรวจในวันนี้แบบลิสต์

8. **สรุปสถานะระบบ**  
   - เช่น สถานะการเชื่อมต่อ Firebase, เวอร์ชันแอป, ข้อมูลบริษัท

**ตัวอย่าง UI เพิ่มเติม:**
- Card "เหตุฉุกเฉินวันนี้" พร้อมไอคอน `<i class="fas fa-exclamation-triangle"></i>`
- Card "แจ้งเตือนล่าสุด" พร้อมไอคอน `<i class="fas fa-bell"></i>`
- Mini map หรือกราฟแท่ง/วงกลม

**สรุป:**  
เพิ่มข้อมูลที่ช่วยให้ผู้ใช้งานเห็นภาพรวมของระบบ, สถานะงาน, และสามารถเข้าถึงฟีเจอร์สำคัญได้รวดเร็ว เช่น สรุปเหตุฉุกเฉิน, แจ้งเตือน, สถิติ, และปุ่มลัดต่าง ๆ

*/

/*1402

bug tab-content*/

/*
เพิ่มในหน้า dashboard
-1.เวลาก่อนจะถึงรอบตรวจ
-2.เวลาในรอบตรวจนี้
-3.
*/

/*
<!--prompt: dashboard ให้เพิ่มรายการที่แสกนแล้ว-->

เพิ่มหน้า tab ใหม่เป็นกราฟสรุปข้อมูลการตรวจจุดต่างๆ รวมถึงข้อมูลการบันทึกเหตุฉุนเฉิด เหมือน dashboard (ไม่ใช้ id dashboard เพราะใช้ไปแล้ว)
saveCheckpoint,ok
editCheckpoint,ok
deleteCheckpoint,ok
saveSchedule,ok
editSchedule,ok
deleteSchedule, ok

saveEmergency, ok
saveEditEmergency, ok
deleteEmergency, ok

login, ok
logout ok.
register, ok
approveUser, ok
deleteUser, ok
saveUserPermissions, ok

handleScanResult,

*/

/*
19-02
nav-bar to sidebar
-แนบรูป ตอนแสกน
-แจ้งเตือน mobile , emergency etc.
-หน้าหลัก บอก user ที่ทำการ scan
-export excel
-เอาสถานะ ล่าช้าออก มีแค่ ตรวจ , ไม่ตรวจ
*/

/*18-03
- แก้ ui หน้า scan *android
- ให้กด export img
- ลบรูปเก่า > 1 week อัตโนมัติ
*/

/*20-30
-บังคับกดอนุญาตตำแหน่ง
-บังคับกดอนุญาตเข้าถึงกล้อง
*/