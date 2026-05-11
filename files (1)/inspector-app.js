// inspector-app.js
// Mobile Inspector App Logic

let currentUser = null;
let scanner = null;
let selectedImages = [];
let emergencyImages = [];
let currentCheckpoint = null;
let currentSchedule = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

// Authentication
function initAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserInfo();
      showMainScreen();
    } else {
      // Redirect to login
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

// Screen Navigation
function showMainScreen() {
  hideAllScreens();
  document.getElementById('mainScreen').classList.remove('hidden');
}

function showScannerScreen() {
  hideAllScreens();
  document.getElementById('scannerScreen').classList.remove('hidden');
}

function showInspectionForm() {
  hideAllScreens();
  document.getElementById('inspectionForm').classList.remove('hidden');
}

function showEmergencyFormScreen() {
  hideAllScreens();
  document.getElementById('emergencyForm').classList.remove('hidden');
}

function hideAllScreens() {
  document.getElementById('mainScreen').classList.add('hidden');
  document.getElementById('scannerScreen').classList.add('hidden');
  document.getElementById('inspectionForm').classList.add('hidden');
  document.getElementById('emergencyForm').classList.add('hidden');
}

// QR Scanner
async function startScanning() {
  showScannerScreen();
  
  scanner = new QRScanner();
  await scanner.startScan('qr-reader', onQRScanned);
}

async function stopScanning() {
  if (scanner) {
    await scanner.stopScan();
    scanner = null;
  }
  showMainScreen();
}

async function onQRScanned(checkpoint) {
  currentCheckpoint = checkpoint;
  
  // แสดงข้อมูลจุดตรวจ
  document.getElementById('checkpointInfo').innerHTML = `
    <h3>${checkpoint.name}</h3>
    <p>📍 ${checkpoint.location}</p>
    <p>${checkpoint.description || ''}</p>
  `;
  
  // ล้างข้อมูลเก่า
  selectedImages = [];
  document.getElementById('notes').value = '';
  updateImagePreview();
  
  showInspectionForm();
}

// Image Handling
function handleImageSelect(event) {
  const files = Array.from(event.target.files);
  
  if (selectedImages.length + files.length > 3) {
    alert('เลือกได้สูงสุด 3 รูป');
    return;
  }
  
  selectedImages.push(...files);
  updateImagePreview();
  
  // Reset input
  event.target.value = '';
}

function updateImagePreview() {
  const container = document.getElementById('imageUpload');
  
  // ล้างรูปเก่า (เว้น add button)
  const previews = container.querySelectorAll('.image-preview');
  previews.forEach(p => p.remove());
  
  // แสดงรูปใหม่
  selectedImages.forEach((file, index) => {
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => removeImage(index);
    
    preview.appendChild(img);
    preview.appendChild(removeBtn);
    container.insertBefore(preview, container.firstChild);
  });
}

function removeImage(index) {
  selectedImages.splice(index, 1);
  updateImagePreview();
}

// Submit Inspection
async function submitInspection() {
  try {
    const notes = document.getElementById('notes').value.trim();
    
    // Show loading
    document.getElementById('uploadProgress').classList.remove('hidden');
    
    // Record inspection
    const result = await InspectionRecorder.recordInspection({
      checkpointId: currentCheckpoint.id,
      checkpointName: currentCheckpoint.name,
      scheduleId: currentSchedule,
      notes: notes,
      images: selectedImages,
      onUploadProgress: (progress) => {
        const fill = document.getElementById('progressFill');
        fill.style.width = progress.percentage + '%';
      }
    });
    
    // Hide loading
    document.getElementById('uploadProgress').classList.add('hidden');
    
    // Show success
    alert('✅ บันทึกการตรวจสำเร็จ');
    
    // Reset
    currentCheckpoint = null;
    currentSchedule = null;
    selectedImages = [];
    
    showMainScreen();
    
  } catch (error) {
    alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

function cancelInspection() {
  if (confirm('ยกเลิกการบันทึก?')) {
    currentCheckpoint = null;
    selectedImages = [];
    showMainScreen();
  }
}

// Emergency Report
function showEmergencyForm() {
  emergencyImages = [];
  document.getElementById('emergencyTitle').value = '';
  document.getElementById('emergencyDescription').value = '';
  updateEmergencyImagePreview();
  showEmergencyFormScreen();
}

function handleEmergencyImageSelect(event) {
  const files = Array.from(event.target.files);
  
  if (emergencyImages.length + files.length > 5) {
    alert('เลือกได้สูงสุด 5 รูป');
    return;
  }
  
  emergencyImages.push(...files);
  updateEmergencyImagePreview();
  event.target.value = '';
}

function updateEmergencyImagePreview() {
  const container = document.getElementById('emergencyImageUpload');
  
  const previews = container.querySelectorAll('.image-preview');
  previews.forEach(p => p.remove());
  
  emergencyImages.forEach((file, index) => {
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => removeEmergencyImage(index);
    
    preview.appendChild(img);
    preview.appendChild(removeBtn);
    container.insertBefore(preview, container.firstChild);
  });
}

function removeEmergencyImage(index) {
  emergencyImages.splice(index, 1);
  updateEmergencyImagePreview();
}

async function submitEmergency() {
  try {
    const type = document.getElementById('emergencyType').value;
    const title = document.getElementById('emergencyTitle').value.trim();
    const description = document.getElementById('emergencyDescription').value.trim();
    
    if (!title || !description) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    
    if (!confirm('ยืนยันการส่งรายงานฉุกเฉิน?')) {
      return;
    }
    
    // Show loading
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ กำลังส่ง...';
    
    await InspectionRecorder.recordEmergency({
      type: type,
      severity: 'high',
      title: title,
      description: description,
      checkpointId: currentCheckpoint?.id,
      checkpointName: currentCheckpoint?.name,
      images: emergencyImages
    });
    
    alert('✅ ส่งรายงานฉุกเฉินสำเร็จ\nทีมงานจะดำเนินการโดยเร็ว');
    
    emergencyImages = [];
    showMainScreen();
    
  } catch (error) {
    alert('❌ เกิดข้อผิดพลาด: ' + error.message);
  } finally {
    const btn = event.target;
    btn.disabled = false;
    btn.innerHTML = '🚨 ส่งรายงาน';
  }
}

function cancelEmergency() {
  if (confirm('ยกเลิกการรายงาน?')) {
    emergencyImages = [];
    showMainScreen();
  }
}

// History
function showHistory() {
  // TODO: แสดงประวัติการตรวจ
  alert('ฟีเจอร์นี้กำลังพัฒนา');
}

// Service Worker for PWA (Optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ Service Worker registered'))
      .catch(err => console.log('❌ SW registration failed:', err));
  });
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
