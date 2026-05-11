// inspection-recorder.js
// บันทึกผลการตรวจ

class InspectionRecorder {
  
  /**
   * บันทึกการตรวจ
   * @param {object} data - ข้อมูลการตรวจ
   */
  static async recordInspection(data) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('กรุณาเข้าสู่ระบบก่อน');
      }
      
      // สร้าง inspection ID
      const inspectionId = `inspection_${Date.now()}_${user.uid.substring(0, 6)}`;
      
      // สร้าง timestamp และ path
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const time = now.toTimeString().split(' ')[0]; // HH:MM:SS
      
      const path = `inspections/${year}-${month}/${day}/${inspectionId}`;
      
      // Upload รูปภาพ (ถ้ามี)
      let imageUrls = [];
      if (data.images && data.images.length > 0) {
        console.log('📤 Uploading images...');
        
        const uploadResults = await CloudinaryUploader.uploadMultiple(
          data.images,
          `inspections/${year}-${month}`,
          (progress) => {
            console.log(`Upload progress: ${progress.percentage}%`);
            // แสดง progress bar ถ้ามี
            if (data.onUploadProgress) {
              data.onUploadProgress(progress);
            }
          }
        );
        
        // กรอง URL ที่ upload สำเร็จ
        imageUrls = uploadResults
          .filter(result => !result.error)
          .map(result => result.url);
      }
      
      // Get location (ถ้าเปิด GPS)
      let location = null;
      if (navigator.geolocation) {
        try {
          location = await this.getCurrentLocation();
        } catch (error) {
          console.warn('⚠️ Cannot get location:', error);
        }
      }
      
      // สร้างข้อมูลการตรวจ
      const inspectionData = {
        id: inspectionId,
        checkpointId: data.checkpointId,
        checkpointName: data.checkpointName,
        scheduleId: data.scheduleId || null,
        inspectorId: user.uid,
        inspectorName: user.displayName || user.email,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: `${year}-${month}-${day}`,
        time: time,
        status: 'completed',
        notes: data.notes || '',
        images: imageUrls,
        location: location,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      };
      
      // บันทึกลง Firebase
      await database.ref(path).set(inspectionData);
      
      console.log('✅ Inspection recorded:', inspectionId);
      
      // อัพเดทสถิติของ checkpoint
      await this.updateCheckpointStats(data.checkpointId);
      
      return {
        success: true,
        inspectionId: inspectionId,
        data: inspectionData
      };
      
    } catch (error) {
      console.error('❌ Record Error:', error);
      throw error;
    }
  }
  
  /**
   * ดึงตำแหน่งปัจจุบัน
   */
  static getCurrentLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }
  
  /**
   * อัพเดทสถิติของจุดตรวจ
   */
  static async updateCheckpointStats(checkpointId) {
    const statsPath = `checkpoints/${checkpointId}/stats`;
    const snapshot = await database.ref(statsPath).once('value');
    const currentStats = snapshot.val() || {
      totalInspections: 0,
      lastInspectedAt: null
    };
    
    await database.ref(statsPath).update({
      totalInspections: currentStats.totalInspections + 1,
      lastInspectedAt: firebase.database.ServerValue.TIMESTAMP
    });
  }
  
  /**
   * ดึงประวัติการตรวจ
   */
  static async getInspectionHistory(filters = {}) {
    try {
      let query = database.ref('inspections');
      
      // Filter by date
      if (filters.startDate) {
        const [year, month] = filters.startDate.split('-');
        query = query.child(`${year}-${month}`);
      }
      
      const snapshot = await query.once('value');
      const data = snapshot.val();
      
      if (!data) return [];
      
      // แปลงเป็น array และ filter
      let inspections = [];
      
      for (const yearMonth in data) {
        for (const day in data[yearMonth]) {
          for (const inspectionId in data[yearMonth][day]) {
            const inspection = data[yearMonth][day][inspectionId];
            
            // Apply filters
            let include = true;
            
            if (filters.checkpointId && inspection.checkpointId !== filters.checkpointId) {
              include = false;
            }
            
            if (filters.inspectorId && inspection.inspectorId !== filters.inspectorId) {
              include = false;
            }
            
            if (filters.scheduleId && inspection.scheduleId !== filters.scheduleId) {
              include = false;
            }
            
            if (include) {
              inspections.push(inspection);
            }
          }
        }
      }
      
      // Sort by timestamp (newest first)
      inspections.sort((a, b) => b.timestamp - a.timestamp);
      
      return inspections;
      
    } catch (error) {
      console.error('❌ Get History Error:', error);
      throw error;
    }
  }
  
  /**
   * บันทึกรายงานฉุกเฉิน
   */
  static async recordEmergency(data) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('กรุณาเข้าสู่ระบบก่อน');
      }
      
      const emergencyId = `emergency_${Date.now()}_${user.uid.substring(0, 6)}`;
      
      // Upload รูปภาพ
      let imageUrls = [];
      if (data.images && data.images.length > 0) {
        const uploadResults = await CloudinaryUploader.uploadMultiple(
          data.images,
          'emergency_reports',
          data.onUploadProgress
        );
        
        imageUrls = uploadResults
          .filter(result => !result.error)
          .map(result => result.url);
      }
      
      // Get location
      let location = null;
      try {
        location = await this.getCurrentLocation();
      } catch (error) {
        console.warn('Cannot get location');
      }
      
      const emergencyData = {
        id: emergencyId,
        type: data.type, // 'fire', 'accident', 'security', 'other'
        severity: data.severity || 'medium', // 'low', 'medium', 'high'
        title: data.title,
        description: data.description,
        reportedBy: user.uid,
        reporterName: user.displayName || user.email,
        checkpointId: data.checkpointId || null,
        checkpointName: data.checkpointName || null,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'reported', // 'reported', 'investigating', 'resolved'
        images: imageUrls,
        location: location,
        resolvedAt: null,
        resolvedBy: null,
        resolution: null
      };
      
      await database.ref(`emergency_reports/${emergencyId}`).set(emergencyData);
      
      console.log('🚨 Emergency reported:', emergencyId);
      
      // ส่งการแจ้งเตือนไปยัง Admin (ถ้ามี)
      await this.notifyAdmins(emergencyData);
      
      return {
        success: true,
        emergencyId: emergencyId,
        data: emergencyData
      };
      
    } catch (error) {
      console.error('❌ Emergency Report Error:', error);
      throw error;
    }
  }
  
  /**
   * แจ้งเตือน Admin
   */
  static async notifyAdmins(emergencyData) {
    // ดึงรายชื่อ Admin users
    const usersSnapshot = await database.ref('users').once('value');
    const users = usersSnapshot.val();
    
    for (const userId in users) {
      const user = users[userId];
      
      if (user.role === 'admin' || user.role === 'supervisor') {
        const notifId = `notif_${Date.now()}_${userId.substring(0, 6)}`;
        
        await database.ref(`notifications/${userId}/${notifId}`).set({
          id: notifId,
          type: 'emergency',
          title: `🚨 รายงานเหตุฉุกเฉิน: ${emergencyData.title}`,
          message: emergencyData.description,
          emergencyId: emergencyData.id,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          isRead: false,
          priority: 'high'
        });
      }
    }
  }
}

// Export
window.InspectionRecorder = InspectionRecorder;
