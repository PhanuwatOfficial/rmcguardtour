/*
ฉันมองเห็นปัญหาที่อาจทำให้ RAM สูง ลองให้ฉันตรวจสอบโค้ดเพื่อหาสาเหตุ: 

Searched for regex `addEventListener|setInterval|firebase.*\.on\(|\.off\(` (`GTR2403` · `index.html`), 50 results

Read [](file:///c%3A/Users/mtw-en01/Downloads/GTR2403/index.html#2260-2260), lines 2260 to 2275

Read [](file:///c%3A/Users/mtw-en01/Downloads/GTR2403/index.html#1418-1418), lines 1418 to 1435

Read [](file:///c%3A/Users/mtw-en01/Downloads/GTR2403/index.html#3040-3040), lines 3040 to 3060

พบปัญหาอยู่ 4 ประการ ที่ทำให้ RAM สูง:

## 🔴 **ปัญหาหลัก:**

### 1. **Firebase listeners ไม่ unsubscribe** (ร้ายแรงสุด)
```javascript
// ❌ ผิด - ไม่มี .off() เพื่อหยุด
firebase.database().ref('schedules').on('value', schedulesSnap => {
    // ...
}); // จะรันไปเรื่อย ๆ ในพื้นหลัง
```
**ผลกระทบ:** ทุกครั้งที่เปิด tab dashboard มี listener ตัวใหม่ที่ไม่ถูกลบ

### 2. **Event listeners หลุดหาย** (Memory Leak)
```javascript
// ❌ ผิด - เรียก renderUsersList() จะเพิ่ม listener ใหม่ทุกครั้ง
document.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', function () { ... });
});
```
ถ้าเรียก `renderUsersList()` 100 ครั้ง = 100 listeners ที่ไม่ถูกลบ

### 3. **setInterval ต่อเนื่อง ไม่ยุติ**
```javascript
window._dashboardCurrentInterval = setInterval(() => {
    renderDashboard(); // ทำงานทุก 10 วินาที ตลอดเวลา
}, 10000);
// ไม่มี clearInterval() ที่ไหน
```

### 4. **ไม่มีการล้างข้อมูลเก่า**
ทุกครั้งที่ render ใหม่ก็ไม่ลบ object/listeners เก่า

---

## ✅ **วิธีแก้ (เร่งด่วน):** 

Read [](file:///c%3A/Users/mtw-en01/Downloads/GTR2403/index.html#2160-2160), lines 2160 to 2300

เพิ่มฟังก์ชัน **cleanup** นี้ใกล้กับ `initializeEventListeners()`:

```javascript
// เพิ่มที่จุดเริ่มต้น script เพื่อเก็บ listeners ที่ต้องเคลียร์
window._activeFirebaseListeners = [];
window._activeDashboardInterval = null;

// ฟังก์ชันล้างข้อมูล listeners
function cleanupListeners() {
    // ปิด Firebase listeners
    if (window._activeFirebaseListeners && window._activeFirebaseListeners.length > 0) {
        window._activeFirebaseListeners.forEach(listener => {
            listener.ref.off('value', listener.callback);
        });
        window._activeFirebaseListeners = [];
    }
    
    // ปิด setInterval
    if (window._activeDashboardInterval) {
        clearInterval(window._activeDashboardInterval);
        window._activeDashboardInterval = null;
    }
}

// เรียก cleanup เมื่อเปลี่ยน tab
tabButtons.forEach(button => {
    button.addEventListener('click', function () {
        // ... existing code ...
        cleanupListeners(); // ✅ เพิ่มบรรทัดนี้
    });
});
```

**แก้ไขใน `renderUsersList()`:**
```javascript
function renderUsersList() {
    const container = document.getElementById('users-list');
    
    // ❌ ลบบรรทัดนี้ ไม่ใช้ forEach + addEventListener
    // document.querySelectorAll('.btn-delete-user').forEach(btn => {
    //     btn.addEventListener('click', function () { ... });
    // });
    
    // ✅ ใช้ Event Delegation แทน (ตรงนี้เพิ่มที่ส่วนท้าย)
    if (!container._delegateSetup) {
        container.addEventListener('click', function(e) {
            if (e.target.closest('.btn-delete-user')) {
                const username = e.target.closest('.btn-delete-user').getAttribute('data-username');
                if (confirm(`คุณแน่ใจว่าต้องการลบผู้ใช้ ${username} ?`)) {
                    deleteUser(username);
                }
            }
            if (e.target.closest('.btn-approve-user')) {
                const username = e.target.closest('.btn-approve-user').getAttribute('data-username');
                usersRef.child(username).update({ status: "approved" });
            }
        });
        container._delegateSetup = true;
    }
}
```

**แก้ไขใน `renderDashboard()`:**
```javascript
function renderDashboard() {
    // ❌ ลบ setInterval ที่ทำให้ loop ตลอด
    // if (window._dashboardCurrentInterval) {
    //     clearInterval(window._dashboardCurrentInterval);
    // }
    // window._dashboardCurrentInterval = setInterval(() => {
    //     renderDashboard();
    // }, 10000);

    // ❌ ปิด .on() และใช้ .once() แทน หรือ unsubscribe
    firebase.database().ref('schedules').once('value', schedulesSnap => {
        // ... existing code ...
    });
    // ❌ ลบ: firebase.database().ref('scan_records').on('value', ...)
}
```

---

**สรุป:** RAM สูงเพราะ:
- 🔴 Firebase listeners รันไม่รู้จบ (อาจ 10+ listeners พร้อมกัน)
- 🔴 Event listeners ซ้อน (render 100 ครั้ง = 100 listeners ที่ไม่ถูกลบ)
- 🔴 setInterval ไม่หยุด + ใช้ `.on()` แทน `.once()`

**ลำดับความสำคัญแก้:**
1. ✅ เลิก `.on()` → ใช้ `.once()` + user-triggered load
2. ✅ ลบ setInterval ที่ทำให้ loop
3. ✅ ใช้ Event Delegation แทน forEach + addEventListener

ต้องการให้ฉันแก้ไขโค้ดหลายจุดได้ไหม?
*/


/*ดี้ถาม! คำตอบ: **ได้ real-time เหมือนเดิม แต่ต้องแก้วิธีให้ถูกต้อง**

**ปัญหาของคำแนะนำแรก:**
ถ้าเปลี่ยนจาก `.on()` เป็น `.once()` ก็จะ **ไม่ใช่ real-time อีก** (`.once()` ดึงเฉพาะครั้งแรก)

---

## ✅ **วิธีแก้ที่ถูก: เก็บ real-time แต่หยุด memory leak**

**ประเด็นสำคัญ:**
- ❌ ปัญหา = listener ไม่ถูกลบเมื่อไม่ใช้
- ✅ วิธีแก้ = ให้เก็บ `.on()` แต่ **unsubscribe ให้ถูกต้อง**

```javascript
// ✅ ที่จุดเริ่มต้น script
let window._firebaseSubscriptions = {};

// ✅ สร้างฟังก์ชัน subscribe แล้วเก็บ reference
function subscribeToSchedules(callback) {
    // ถ้ามี listener อยู่แล้ว ให้ปิดก่อน (ไม่ให้ซ้อน)
    if (window._firebaseSubscriptions.schedules) {
        window._firebaseSubscriptions.schedules();
    }
    
    // ✅ ติดตั้ง listener ใหม่ (real-time)
    const ref = firebase.database().ref('schedules');
    const listener = ref.on('value', callback);
    
    // เก็บ unsubscribe function ไว้ (เพื่อปิดได้ทีหลัง)
    window._firebaseSubscriptions.schedules = () => ref.off('value', callback);
}

// ✅ เมื่อเปลี่ยน tab ให้ปิด listeners
function cleanupCurrentTab() {
    Object.values(window._firebaseSubscriptions).forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
    });
    window._firebaseSubscriptions = {};
}
```

**ใช้ใน `renderDashboard()`:**
```javascript
function renderDashboard() {
    subscribeToSchedules((schedulesSnap) => {
        // ✅ แต่ละครั้งโลก data เปลี่ยนจาก Firebase
        // จะเรียก function นี้ให้ (real-time)
        
        let schedulesToday = [];
        if (schedulesSnap.exists()) {
            schedulesSnap.forEach(child => {
                const sch = child.val();
                // ... existing logic ...
            });
        }
        
        // อัปเดต UI ด้วย schedulesToday
        updateDashboardUI(schedulesToday);
    });
}

// ✅ เก็บเฉพาะ 1 setInterval (ไม่ใช่ซ้อน)
if (!window._dashboardInterval) {
    window._dashboardInterval = setInterval(() => {
        renderDashboard();
    }, 10000);
}
```

**เมื่อเปลี่ยน tab:**
```javascript
tabButtons.forEach(button => {
    button.addEventListener('click', function () {
        const tabId = this.getAttribute('data-tab');
        
        // ❌ ปิด real-time listeners เมื่อออกจาก dashboard
        if (tabId !== 'dashboard') {
            cleanupCurrentTab();
            if (window._dashboardInterval) {
                clearInterval(window._dashboardInterval);
                window._dashboardInterval = null;
            }
        }
        // ✅ เปิดใหม่เมื่อกลับเข้า dashboard
        else {
            renderDashboard();
        }
    });
});
```

---

## **เปรียบเทียบวิธี:**

| วิธี | Real-time | RAM | ปัญหา |
|-----|-----------|-----|-------|
| `.on()` ไม่ปิด | ✅ | ❌❌❌ สูงมาก | listener ซ้อน |
| `.once()` | ❌ | ✅ | ไม่ real-time |
| `.on()` + unsubscribe | ✅ | ✅ | **ดีที่สุด** |

---

**ลำดับการแก้ที่ถูก:**
1. ✅ เก็บ `.on()` (เพื่อ real-time)
2. ✅ เพิ่ม `.off()` เมื่อ switch tab (หยุด leak)
3. ✅ ลบ event listener ที่หลวม (ใช้ delegation)
4. ✅ เก็บ setInterval เพียง 1 ตัว (ไม่ธรรมชาติ)

**ผลลัพธ์:** Real-time + RAM ตำ่าปกติ ✅

ต้องการให้แก้ไขโค้ดแบบนี้ไหม? */