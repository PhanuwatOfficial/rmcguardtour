// qr-generator.js
// สำหรับ Admin สร้าง QR Code สำหรับแต่ละจุดตรวจ

class QRGenerator {
  
  /**
   * สร้าง QR Code จาก Checkpoint ID
   * @param {string} checkpointId - ID ของจุดตรวจ
   * @param {HTMLElement} container - Element ที่จะแสดง QR
   */
  static async generateQR(checkpointId, container) {
    try {
      // สร้าง Unique QR String
      const qrData = `PATROL_${checkpointId}_${Date.now()}`;
      
      // ใช้ qrcode.js library
      // <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      
      // ล้าง container ก่อน
      container.innerHTML = '';
      
      // สร้าง QR Code
      const qrCode = new QRCode(container, {
        text: qrData,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
      
      // บันทึก QR Data ลง Firebase
      await database.ref(`checkpoints/${checkpointId}`).update({
        qrCode: qrData,
        qrGeneratedAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      console.log(`✅ QR Code generated for ${checkpointId}`);
      return qrData;
      
    } catch (error) {
      console.error('❌ QR Generation Error:', error);
      throw error;
    }
  }
  
  /**
   * ดาวน์โหลด QR Code เป็นรูป PNG
   */
  static downloadQR(checkpointId, checkpointName) {
    const canvas = document.querySelector(`#qr-${checkpointId} canvas`);
    if (!canvas) {
      alert('ไม่พบ QR Code');
      return;
    }
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${checkpointName}_${checkpointId}.png`;
    link.click();
  }
  
  /**
   * สร้าง QR Code หลายจุดพร้อมกัน
   */
  static async generateBatchQR(checkpoints) {
    const results = [];
    
    for (const checkpoint of checkpoints) {
      const container = document.createElement('div');
      container.id = `qr-${checkpoint.id}`;
      
      const qrData = await this.generateQR(checkpoint.id, container);
      
      results.push({
        checkpointId: checkpoint.id,
        qrData: qrData,
        element: container
      });
    }
    
    return results;
  }
}

// Export
window.QRGenerator = QRGenerator;
