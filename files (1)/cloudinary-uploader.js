// cloudinary-uploader.js
// Upload รูปภาพไปยัง Cloudinary

class CloudinaryUploader {
  
  /**
   * Upload รูปเดียว
   * @param {File} file - ไฟล์รูปภาพ
   * @param {string} folder - ชื่อ folder ใน Cloudinary
   * @param {function} onProgress - Callback สำหรับ progress
   */
  static async uploadImage(file, folder = 'inspections', onProgress = null) {
    try {
      // Validate file
      if (!file || !file.type.startsWith('image/')) {
        throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น');
      }
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      }
      
      // Compress image before upload
      const compressedFile = await this.compressImage(file);
      
      // สร้าง FormData
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      formData.append('folder', folder);
      
      // เพิ่ม timestamp ในชื่อไฟล์
      const timestamp = Date.now();
      formData.append('public_id', `${folder}/${timestamp}`);
      
      // Upload to Cloudinary
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      console.log('✅ Image uploaded:', data.secure_url);
      
      return {
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
        format: data.format,
        size: data.bytes
      };
      
    } catch (error) {
      console.error('❌ Upload Error:', error);
      throw error;
    }
  }
  
  /**
   * Upload หลายรูปพร้อมกัน
   * @param {FileList} files - ไฟล์รูปภาพหลายไฟล์
   * @param {string} folder - ชื่อ folder
   * @param {function} onProgress - Callback แสดง progress
   */
  static async uploadMultiple(files, folder = 'inspections', onProgress = null) {
    const results = [];
    const total = files.length;
    
    for (let i = 0; i < total; i++) {
      const file = files[i];
      
      try {
        const result = await this.uploadImage(file, folder);
        results.push(result);
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: total,
            percentage: Math.round(((i + 1) / total) * 100),
            fileName: file.name
          });
        }
        
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        results.push({
          error: true,
          fileName: file.name,
          message: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * บีบอัดรูปภาพก่อน upload
   */
  static compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Scale down ถ้ากว้างเกิน maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to Blob
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }));
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = reject;
        img.src = e.target.result;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * สร้าง thumbnail URL จาก Cloudinary
   */
  static getThumbnail(imageUrl, width = 200, height = 200) {
    if (!imageUrl || !imageUrl.includes('cloudinary')) {
      return imageUrl;
    }
    
    // แทรก transformation parameter
    const parts = imageUrl.split('/upload/');
    return `${parts[0]}/upload/c_fill,w_${width},h_${height},q_auto/${parts[1]}`;
  }
  
  /**
   * ลบรูปจาก Cloudinary (ต้องใช้ Backend)
   * หมายเหตุ: การลบรูปต้องทำผ่าน Backend เพราะต้องใช้ API Secret
   */
  static async deleteImage(publicId) {
    console.warn('⚠️ Delete operation requires backend implementation');
    // ต้องสร้าง Cloud Function หรือ Backend API สำหรับลบรูป
    return false;
  }
}

// Export
window.CloudinaryUploader = CloudinaryUploader;
