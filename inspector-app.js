// inspector-app.js - Mobile Inspector App Main Logic

let currentUser = null;
let scanner = null;
let selectedImages = [];
let emergencyImages = [];
let currentCheckpoint = null;
let currentSchedule = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  registerServiceWorker();
});

// Authentication
function initAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserInfo();
      setupNotifications();
      showMainScreen();
    } else {
      window.location.href = 'login.html';
    }
  });
}

async function loadUserInfo() {
  const snapshot = await database.ref(`users/${currentUser.uid}`).once('value');
  const userData = snapshot.val();
  
  document.getElementById('userInfo').innerHTML = `
    👤 ${userData?.displayName || currentUser.email}
  `;
}

// Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('✅ Service Worker registered'))
      .catch(err => console.error('Service Worker error:', err));
  }
}

// Setup notifications
function setupNotifications() {
  const thaiDate = getCurrentThaiDate();
  const path = `schedules`;
  
  database.ref(path).on('value', (snapshot) => {
    const schedules = snapshot.val();
    if (!schedules) return;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (const scheduleId in schedules) {
      const schedule = schedules[scheduleId];
      const [hour, min] = schedule.startTime.split(':').map(Number);
      const scheduleTime = hour * 60 + min;
      
      // Notify 15 minutes before
      const notifyTime = scheduleTime - 15;
      if (currentTime === notifyTime) {
        notifySchedule(schedule);
      }
    }
  });
}

function notifySchedule(schedule) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('⏰ เตือนการตรวจ', {
      body: `จะถึงเวลาตรวจ: ${schedule.name}`,
      icon: '/icon-192.png',
      badge: '/badge.png'
    });
  }
}

// Screen Navigation
function showMainScreen() {
  hideAllScreens();
  document.getElementById('mainScreen').classList.remove('hidden');
}

function hideAllScreens() {
  document.querySelectorAll('[id$="View"], [id$="Form"], [id$="Screen"]').forEach(el => {
    if (el.id !== 'mainScreen') el.classList.add('hidden');
  });
}

// QR Scanning
async function startScanning() {
  showScannerScreen();
  scanner = new QRScanner();
  await scanner.startScan('qr-reader', onQRScanned);
}

function showScannerScreen() {
  hideAllScreens();
  document.getElementById('scannerScreen').classList.remove('hidden');
}

async function stopScanning() {
  if (scanner) await scanner.stopScan();
  showMainScreen();
}

async function onQRScanned(checkpoint, scheduleId) {
  currentCheckpoint = checkpoint;
  currentSchedule = scheduleId;
  
  document.getElementById('checkpointInfo').innerHTML = `
    <h3>${checkpoint.name}</h3>
    <p>📍 ${checkpoint.location}</p>
    <p>${checkpoint.description || ''}</p>
  `;
  
  selectedImages = [];
  document.getElementById('notes').value = '';
  updateImagePreview();
  
  showInspectionForm();
}

function showInspectionForm() {
  hideAllScreens();
  document.getElementById('inspectionForm').classList.remove('hidden');
}

// Image handling
function handleImageSelect(event) {
  const files = Array.from(event.target.files);
  if (selectedImages.length + files.length > 3) {
    alert('สามารถเลือกได้สูงสุด 3 รูป');
    return;
  }
  
  selectedImages.push(...files);
  updateImagePreview();
}

function updateImagePreview() {
  const container = document.getElementById('imageUpload');
  const existing = container.querySelectorAll('.image-preview');
  existing.forEach(el => el.remove());
  
  selectedImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      preview.innerHTML = `
        <img src="${e.target.result}">
        <button class="remove" onclick="removeImage(${index})">×</button>
      `;
      container.insertBefore(preview, container.lastElementChild);
    };
    reader.readAsDataURL(file);
  });
}

function removeImage(index) {
  selectedImages.splice(index, 1);
  updateImagePreview();
}

// Submit inspection
async function submitInspection() {
  try {
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.classList.remove('hidden');
    
    // Upload images
    let photoUrls = [];
    if (selectedImages.length > 0) {
      const uploadResults = await CloudinaryUploader.uploadMultiple(
        selectedImages,
        'CHECK',
        (progress) => {
          const percent = progress.percentage;
          document.getElementById('progressFill').style.width = percent + '%';
        }
      );
      
      photoUrls = uploadResults
        .filter(r => !r.error)
        .map(r => r.url);
    }
    
    // Get GPS location
    let gpsLocation = null;
    try {
      gpsLocation = await InspectionRecorder.getGPSLocation();
    } catch (error) {
      console.warn('GPS not available:', error);
    }
    
    // Save inspection
    await InspectionRecorder.saveInspection({
      checkpointId: currentCheckpoint.id,
      checkpointName: currentCheckpoint.name,
      scheduleId: currentSchedule,
      notes: document.getElementById('notes').value,
      photos: photoUrls,
      location: gpsLocation
    });
    
    // Show success
    progressDiv.classList.add('hidden');
    alert('✅ บันทึกการตรวจสำเร็จ!');
    showMainScreen();
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

function cancelInspection() {
  currentCheckpoint = null;
  selectedImages = [];
  showMainScreen();
}

// Emergency reporting
function showEmergencyForm() {
  hideAllScreens();
  document.getElementById('emergencyForm').classList.remove('hidden');
}

function handleEmergencyImageSelect(event) {
  emergencyImages = Array.from(event.target.files);
  updateEmergencyImagePreview();
}

function updateEmergencyImagePreview() {
  const container = document.getElementById('emergencyImageUpload');
  const existing = container.querySelectorAll('.image-preview');
  existing.forEach(el => el.remove());
  
  emergencyImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      preview.innerHTML = `
        <img src="${e.target.result}">
        <button class="remove" onclick="removeEmergencyImage(${index})">×</button>
      `;
      container.insertBefore(preview, container.lastElementChild);
    };
    reader.readAsDataURL(file);
  });
}

function removeEmergencyImage(index) {
  emergencyImages.splice(index, 1);
  updateEmergencyImagePreview();
}

async function submitEmergency() {
  try {
    document.getElementById('uploadProgress').classList.remove('hidden');
    
    // Upload images
    let photoUrls = [];
    if (emergencyImages.length > 0) {
      const uploadResults = await CloudinaryUploader.uploadMultiple(
        emergencyImages,
        'EMERGENCY',
        (progress) => {
          document.getElementById('progressFill').style.width = progress.percentage + '%';
        }
      );
      
      photoUrls = uploadResults
        .filter(r => !r.error)
        .map(r => r.url);
    }
    
    // Get location
    let gpsLocation = null;
    try {
      gpsLocation = await InspectionRecorder.getGPSLocation();
    } catch (error) {
      console.warn('GPS not available', error);
    }
    
    // Save emergency report
    const reportId = generateUUID();
    const thaiDate = getCurrentThaiDate();
    
    const reportData = {
      id: reportId,
      reporterId: currentUser.uid,
      reporterName: currentUser.displayName || currentUser.email,
      type: document.getElementById('emergencyType').value,
      title: document.getElementById('emergencyTitle').value,
      description: document.getElementById('emergencyDescription').value,
      photos: photoUrls,
      location: gpsLocation,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      status: 'reported',
      priority: 'high'
    };
    
    const path = `emergency_reports/${thaiDate.year}-${thaiDate.month}/${thaiDate.day}/${reportId}`;
    await database.ref(path).set(reportData);
    
    // Also save to active reports for quick access
    await database.ref(`emergency_active/${reportId}`).set(reportData);
    
    document.getElementById('uploadProgress').classList.add('hidden');
    alert('✅ ส่งรายงานเหตุฉุกเฉินสำเร็จ!');
    cancelEmergency();
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

function cancelEmergency() {
  emergencyImages = [];
  document.getElementById('emergencyTitle').value = '';
  document.getElementById('emergencyDescription').value = '';
  showMainScreen();
}

// History view
function showHistory() {
  alert('ฟีเจอร์นี้จะเพิ่มเร็ว ๆ นี้');
}

// Logout
async function logout() {
  await auth.signOut();
  window.location.href = 'login.html';
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}