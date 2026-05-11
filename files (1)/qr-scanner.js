// qr-scanner.js
// สำหรับ Inspector สแกน QR Code ด้วยกล้องมือถือ

class QRScanner {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;
  }
  
  /**
   * เริ่มสแกน QR Code
   * @param {string} elementId - ID ของ element ที่จะแสดงกล้อง
   * @param {function} onSuccess - Callback เมื่อสแกนสำเร็จ
   */
  async startScan(elementId, onSuccess) {
    try {
      // ใช้ html5-qrcode library
      // <script src="https://unpkg.com/html5-qrcode"></script>
      
      this.html5QrCode = new Html5Qrcode(elementId);
      this.isScanning = true;
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await this.html5QrCode.start(
        { facingMode: "environment" }, // กล้องหลัง
        config,
        async (decodedText, decodedResult) => {
          // สแกนสำเร็จ
          console.log('✅ QR Scanned:', decodedText);
          
          // หยุดสแกนชั่วคราว
          await this.stopScan();
          
          // ตรวจสอบ QR Code
          const validation = await this.validateQR(decodedText);
          
          if (validation.isValid) {
            onSuccess(validation.checkpoint);
          } else {
            alert(validation.message);
            // เริ่มสแกนใหม่
            await this.startScan(elementId, onSuccess);
          }
        },
        (errorMessage) => {
          // ไม่ต้องทำอะไร (scanning อยู่)
        }
      );
      
      console.log('📷 Camera started');
      
    } catch (error) {
      console.error('❌ Scanner Error:', error);
      alert('ไม่สามารถเปิดกล้องได้: ' + error);
    }
  }
  
  /**
   * หยุดสแกน
   */
  async stopScan() {
    if (this.html5QrCode && this.isScanning) {
      await this.html5QrCode.stop();
      this.isScanning = false;
      console.log('🛑 Scanner stopped');
    }
  }
  
  /**
   * ตรวจสอบ QR Code ว่าถูกต้องหรือไม่
   */
  async validateQR(qrData) {
    try {
      // ตรวจสอบรูปแบบ QR
      if (!qrData.startsWith('PATROL_')) {
        return {
          isValid: false,
          message: '❌ QR Code ไม่ถูกต้อง'
        };
      }
      
      // แยก checkpoint ID
      const parts = qrData.split('_');
      const checkpointId = parts[1];
      
      // ดึงข้อมูล checkpoint จาก Firebase
      const snapshot = await database.ref(`checkpoints/${checkpointId}`).once('value');
      
      if (!snapshot.exists()) {
        return {
          isValid: false,
          message: '❌ ไม่พบจุดตรวจนี้ในระบบ'
        };
      }
      
      const checkpoint = snapshot.val();
      
      // ตรวจสอบว่า QR Code ตรงกับที่บันทึกไว้หรือไม่
      if (checkpoint.qrCode !== qrData) {
        return {
          isValid: false,
          message: '❌ QR Code ไม่ตรงกับข้อมูลในระบบ'
        };
      }
      
      // ตรวจสอบว่าจุดตรวจยังใช้งานอยู่หรือไม่
      if (!checkpoint.isActive) {
        return {
          isValid: false,
          message: '⚠️ จุดตรวจนี้ถูกปิดใช้งาน'
        };
      }
      
      // ตรวจสอบว่าอยู่ในรอบตรวจหรือไม่
      const scheduleCheck = await this.checkSchedule(checkpointId);
      if (!scheduleCheck.isInSchedule) {
        return {
          isValid: false,
          message: `⏰ ไม่อยู่ในรอบตรวจ\n${scheduleCheck.message}`
        };
      }
      
      // ตรวจสอบว่าเคยสแกนในรอบนี้แล้วหรือไม่
      const duplicateCheck = await this.checkDuplicate(checkpointId, scheduleCheck.scheduleId);
      if (duplicateCheck.isDuplicate) {
        return {
          isValid: false,
          message: `⚠️ คุณได้ตรวจจุดนี้ในรอบนี้แล้ว\nเวลา: ${duplicateCheck.inspectedAt}`
        };
      }
      
      // ผ่านทุกการตรวจสอบ
      return {
        isValid: true,
        checkpoint: checkpoint,
        scheduleId: scheduleCheck.scheduleId
      };
      
    } catch (error) {
      console.error('❌ Validation Error:', error);
      return {
        isValid: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ'
      };
    }
  }
  
  /**
   * ตรวจสอบว่าอยู่ในรอบตรวจหรือไม่
   */
  async checkSchedule(checkpointId) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // นาทีจาก midnight
    const dayOfWeek = now.getDay();
    
    // ดึง schedules ทั้งหมด
    const snapshot = await database.ref('schedules').once('value');
    const schedules = snapshot.val();
    
    if (!schedules) {
      return {
        isInSchedule: false,
        message: 'ไม่มีรอบตรวจในระบบ'
      };
    }
    
    // หา schedule ที่ตรงกับเวลาปัจจุบัน
    for (const scheduleId in schedules) {
      const schedule = schedules[scheduleId];
      
      // ตรวจสอบว่ามีจุดตรวจนี้ใน schedule หรือไม่
      if (!schedule.checkpoints || !schedule.checkpoints.includes(checkpointId)) {
        continue;
      }
      
      // ตรวจสอบวันในสัปดาห์
      if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(dayOfWeek)) {
        continue;
      }
      
      // แปลงเวลา
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      // ตรวจสอบเวลา
      if (currentTime >= startMinutes && currentTime <= endMinutes) {
        return {
          isInSchedule: true,
          scheduleId: scheduleId,
          scheduleName: schedule.name
        };
      }
    }
    
    return {
      isInSchedule: false,
      message: 'ไม่อยู่ในช่วงเวลาตรวจ'
    };
  }
  
  /**
   * ตรวจสอบว่าเคยสแกนในรอบนี้แล้วหรือไม่
   */
  async checkDuplicate(checkpointId, scheduleId) {
    const user = auth.currentUser;
    if (!user) return { isDuplicate: false };
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const path = `inspections/${year}-${month}/${day}`;
    const snapshot = await database.ref(path).once('value');
    const inspections = snapshot.val();
    
    if (!inspections) return { isDuplicate: false };
    
    // หาการตรวจที่ตรงกับ checkpoint, schedule, และ user
    for (const inspectionId in inspections) {
      const inspection = inspections[inspectionId];
      
      if (
        inspection.checkpointId === checkpointId &&
        inspection.scheduleId === scheduleId &&
        inspection.inspectorId === user.uid
      ) {
        const time = new Date(inspection.timestamp).toLocaleTimeString('th-TH');
        return {
          isDuplicate: true,
          inspectedAt: time
        };
      }
    }
    
    return { isDuplicate: false };
  }
}

// Export
window.QRScanner = QRScanner;
