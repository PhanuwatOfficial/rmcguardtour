// admin-dashboard.js
// Admin Dashboard Logic

let currentView = 'dashboard';
let inspectionChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDashboard();
});

function initAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      await checkAdminRole(user);
      loadDashboard();
    } else {
      window.location.href = 'login.html';
    }
  });
}

async function checkAdminRole(user) {
  const snapshot = await database.ref(`users/${user.uid}`).once('value');
  const userData = snapshot.val();
  
  if (!userData || (userData.role !== 'admin' && userData.role !== 'supervisor')) {
    alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
    auth.signOut();
    window.location.href = 'login.html';
  }
  
  document.getElementById('userName').textContent = userData.displayName || user.email;
}

function initDashboard() {
  // Initialize Chart.js
  const ctx = document.getElementById('inspectionChart');
  inspectionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'จำนวนการตรวจ',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// Load Dashboard Data
async function loadDashboard() {
  await Promise.all([
    loadStats(),
    loadChart(),
    loadRecentActivity()
  ]);
}

async function loadStats() {
  try {
    // Today's inspections
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const todayPath = `inspections/${year}-${month}/${day}`;
    const todaySnapshot = await database.ref(todayPath).once('value');
    const todayInspections = todaySnapshot.val();
    const todayCount = todayInspections ? Object.keys(todayInspections).length : 0;
    
    document.getElementById('todayInspections').textContent = todayCount;
    
    // Total checkpoints
    const checkpointsSnapshot = await database.ref('checkpoints').once('value');
    const checkpoints = checkpointsSnapshot.val();
    const checkpointsCount = checkpoints ? Object.keys(checkpoints).length : 0;
    
    document.getElementById('totalCheckpoints').textContent = checkpointsCount;
    
    // Emergency reports (pending)
    const emergencySnapshot = await database.ref('emergency_reports').once('value');
    const emergencies = emergencySnapshot.val();
    let pendingCount = 0;
    
    if (emergencies) {
      for (const id in emergencies) {
        if (emergencies[id].status === 'reported') {
          pendingCount++;
        }
      }
    }
    
    document.getElementById('emergencyReports').textContent = pendingCount;
    
    // Total inspectors
    const usersSnapshot = await database.ref('users').once('value');
    const users = usersSnapshot.val();
    let inspectorCount = 0;
    
    if (users) {
      for (const id in users) {
        if (users[id].role === 'inspector') {
          inspectorCount++;
        }
      }
    }
    
    document.getElementById('totalInspectors').textContent = inspectorCount;
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadChart() {
  try {
    const labels = [];
    const data = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      labels.push(`${day}/${month}`);
      
      const path = `inspections/${year}-${month}/${day}`;
      const snapshot = await database.ref(path).once('value');
      const inspections = snapshot.val();
      const count = inspections ? Object.keys(inspections).length : 0;
      
      data.push(count);
    }
    
    inspectionChart.data.labels = labels;
    inspectionChart.data.datasets[0].data = data;
    inspectionChart.update();
    
  } catch (error) {
    console.error('Error loading chart:', error);
  }
}

async function loadRecentActivity() {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    const snapshot = await database.ref(`inspections/${year}-${month}`).once('value');
    const monthData = snapshot.val();
    
    if (!monthData) {
      document.getElementById('recentActivity').innerHTML = '<p>ยังไม่มีกิจกรรม</p>';
      return;
    }
    
    // Collect all inspections
    let allInspections = [];
    for (const day in monthData) {
      for (const id in monthData[day]) {
        allInspections.push(monthData[day][id]);
      }
    }
    
    // Sort by timestamp (newest first)
    allInspections.sort((a, b) => b.timestamp - a.timestamp);
    
    // Take only last 10
    const recent = allInspections.slice(0, 10);
    
    let html = '<table><thead><tr><th>เวลา</th><th>จุดตรวจ</th><th>ผู้ตรวจ</th></tr></thead><tbody>';
    
    recent.forEach(inspection => {
      const time = new Date(inspection.timestamp).toLocaleString('th-TH');
      html += `
        <tr>
          <td>${time}</td>
          <td>${inspection.checkpointName}</td>
          <td>${inspection.inspectorName}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    document.getElementById('recentActivity').innerHTML = html;
    
  } catch (error) {
    console.error('Error loading recent activity:', error);
    document.getElementById('recentActivity').innerHTML = '<p>เกิดข้อผิดพลาด</p>';
  }
}

// View Navigation
function showDashboard() {
  switchView('dashboard', 'Dashboard');
  loadDashboard();
}

function showCheckpoints() {
  switchView('checkpoints', 'จุดตรวจ');
  loadCheckpoints();
}

function showInspections() {
  switchView('inspections', 'ประวัติการตรวจ');
  loadInspections();
}

function showSchedules() {
  switchView('schedules', 'ตารางตรวจ');
  alert('ฟีเจอร์นี้กำลังพัฒนา');
}

function showEmergencies() {
  switchView('emergencies', 'รายงานฉุกเฉิน');
  loadEmergencies();
}

function showUsers() {
  switchView('users', 'ผู้ใช้งาน');
  alert('ฟีเจอร์นี้กำลังพัฒนา');
}

function switchView(view, title) {
  // Hide all views
  document.getElementById('dashboardView').classList.add('hidden');
  document.getElementById('checkpointsView').classList.add('hidden');
  document.getElementById('inspectionsView').classList.add('hidden');
  document.getElementById('emergenciesView').classList.add('hidden');
  
  // Show selected view
  document.getElementById(view + 'View').classList.remove('hidden');
  document.getElementById('pageTitle').textContent = title;
  
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.classList.add('active');
  
  currentView = view;
}

// Checkpoints Management
async function loadCheckpoints() {
  try {
    const snapshot = await database.ref('checkpoints').once('value');
    const checkpoints = snapshot.val();
    
    const tbody = document.querySelector('#checkpointsTable tbody');
    tbody.innerHTML = '';
    
    if (!checkpoints) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">ยังไม่มีจุดตรวจ</td></tr>';
      return;
    }
    
    for (const id in checkpoints) {
      const cp = checkpoints[id];
      const row = `
        <tr>
          <td>${cp.name}</td>
          <td>${cp.location}</td>
          <td>${cp.zone || '-'}</td>
          <td><span class="badge ${cp.isActive ? 'badge-success' : 'badge-warning'}">${cp.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></td>
          <td>
            <button class="btn btn-secondary" onclick="viewQR('${id}')">QR Code</button>
            <button class="btn btn-secondary" onclick="editCheckpoint('${id}')">แก้ไข</button>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    }
    
  } catch (error) {
    console.error('Error loading checkpoints:', error);
  }
}

function showAddCheckpointModal() {
  document.getElementById('addCheckpointModal').classList.add('active');
  document.getElementById('qrDisplay').classList.add('hidden');
}

function closeCheckpointModal() {
  document.getElementById('addCheckpointModal').classList.remove('active');
  
  // Clear form
  document.getElementById('checkpointName').value = '';
  document.getElementById('checkpointLocation').value = '';
  document.getElementById('checkpointZone').value = '';
  document.getElementById('checkpointDescription').value = '';
  
  // Clear QR
  document.getElementById('qrcode').innerHTML = '';
}

async function saveCheckpoint() {
  try {
    const name = document.getElementById('checkpointName').value.trim();
    const location = document.getElementById('checkpointLocation').value.trim();
    const zone = document.getElementById('checkpointZone').value.trim();
    const description = document.getElementById('checkpointDescription').value.trim();
    
    if (!name || !location) {
      alert('กรุณากรอกชื่อและตำแหน่ง');
      return;
    }
    
    // Generate ID
    const checkpointId = `checkpoint_${Date.now()}`;
    
    // Create checkpoint data
    const checkpointData = {
      id: checkpointId,
      name: name,
      location: location,
      zone: zone,
      description: description,
      qrCode: '',
      createdBy: auth.currentUser.uid,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      isActive: true
    };
    
    // Save to Firebase
    await database.ref(`checkpoints/${checkpointId}`).set(checkpointData);
    
    // Generate QR Code
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    
    await QRGenerator.generateQR(checkpointId, qrContainer);
    
    document.getElementById('qrDisplay').classList.remove('hidden');
    
    alert('✅ เพิ่มจุดตรวจสำเร็จ');
    
    // Reload list
    loadCheckpoints();
    
  } catch (error) {
    console.error('Error saving checkpoint:', error);
    alert('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

async function viewQR(checkpointId) {
  const snapshot = await database.ref(`checkpoints/${checkpointId}`).once('value');
  const checkpoint = snapshot.val();
  
  // Show in modal
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content" style="text-align: center;">
      <h2>${checkpoint.name}</h2>
      <div id="qr-view"></div>
      <button class="btn btn-primary" onclick="QRGenerator.downloadQR('${checkpointId}', '${checkpoint.name}')">ดาวน์โหลด QR</button>
      <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">ปิด</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Generate QR
  const container = document.getElementById('qr-view');
  await QRGenerator.generateQR(checkpointId, container);
}

// Inspections
async function loadInspections() {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    const snapshot = await database.ref(`inspections/${year}-${month}`).once('value');
    const monthData = snapshot.val();
    
    const tbody = document.querySelector('#inspectionsTable tbody');
    tbody.innerHTML = '';
    
    if (!monthData) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">ยังไม่มีข้อมูล</td></tr>';
      return;
    }
    
    let allInspections = [];
    for (const day in monthData) {
      for (const id in monthData[day]) {
        allInspections.push(monthData[day][id]);
      }
    }
    
    allInspections.sort((a, b) => b.timestamp - a.timestamp);
    
    allInspections.forEach(inspection => {
      const time = new Date(inspection.timestamp).toLocaleString('th-TH');
      const images = inspection.images && inspection.images.length > 0 
        ? `<button class="btn btn-secondary" onclick="viewImages(${JSON.stringify(inspection.images).replace(/"/g, '&quot;')})">ดูรูป (${inspection.images.length})</button>`
        : '-';
      
      const row = `
        <tr>
          <td>${time}</td>
          <td>${inspection.checkpointName}</td>
          <td>${inspection.inspectorName}</td>
          <td>${inspection.notes || '-'}</td>
          <td>${images}</td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
    
  } catch (error) {
    console.error('Error loading inspections:', error);
  }
}

function viewImages(images) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  
  let imagesHtml = '';
  images.forEach(url => {
    imagesHtml += `<img src="${url}" style="max-width: 100%; margin: 10px 0; border-radius: 10px;">`;
  });
  
  modal.innerHTML = `
    <div class="modal-content">
      <h2>รูปภาพ</h2>
      ${imagesHtml}
      <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">ปิด</button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Emergency Reports
async function loadEmergencies() {
  try {
    const snapshot = await database.ref('emergency_reports').once('value');
    const emergencies = snapshot.val();
    
    const tbody = document.querySelector('#emergenciesTable tbody');
    tbody.innerHTML = '';
    
    if (!emergencies) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">ยังไม่มีรายงานฉุกเฉิน</td></tr>';
      return;
    }
    
    const emergencyArray = Object.values(emergencies);
    emergencyArray.sort((a, b) => b.timestamp - a.timestamp);
    
    emergencyArray.forEach(emergency => {
      const time = new Date(emergency.timestamp).toLocaleString('th-TH');
      const typeEmoji = {
        fire: '🔥',
        accident: '⚠️',
        security: '🔒',
        medical: '🏥',
        other: '📌'
      };
      
      const statusBadge = emergency.status === 'reported' 
        ? '<span class="badge badge-danger">รอดำเนินการ</span>'
        : '<span class="badge badge-success">ดำเนินการแล้ว</span>';
      
      const row = `
        <tr>
          <td>${time}</td>
          <td>${typeEmoji[emergency.type] || '📌'} ${emergency.type}</td>
          <td>${emergency.title}</td>
          <td>${emergency.reporterName}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-secondary" onclick="viewEmergency('${emergency.id}')">รายละเอียด</button>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
    
  } catch (error) {
    console.error('Error loading emergencies:', error);
  }
}

async function viewEmergency(emergencyId) {
  const snapshot = await database.ref(`emergency_reports/${emergencyId}`).once('value');
  const emergency = snapshot.val();
  
  let imagesHtml = '';
  if (emergency.images && emergency.images.length > 0) {
    emergency.images.forEach(url => {
      imagesHtml += `<img src="${url}" style="max-width: 100%; margin: 10px 0; border-radius: 10px;">`;
    });
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🚨 รายงานฉุกเฉิน</h2>
      <p><strong>หัวข้อ:</strong> ${emergency.title}</p>
      <p><strong>ประเภท:</strong> ${emergency.type}</p>
      <p><strong>รายละเอียด:</strong> ${emergency.description}</p>
      <p><strong>ผู้รายงาน:</strong> ${emergency.reporterName}</p>
      <p><strong>เวลา:</strong> ${new Date(emergency.timestamp).toLocaleString('th-TH')}</p>
      ${imagesHtml}
      <button class="btn btn-primary" onclick="resolveEmergency('${emergencyId}')">ดำเนินการแล้ว</button>
      <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">ปิด</button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function resolveEmergency(emergencyId) {
  if (!confirm('ยืนยันการดำเนินการ?')) return;
  
  await database.ref(`emergency_reports/${emergencyId}`).update({
    status: 'resolved',
    resolvedAt: firebase.database.ServerValue.TIMESTAMP,
    resolvedBy: auth.currentUser.uid
  });
  
  alert('✅ บันทึกการดำเนินการแล้ว');
  document.querySelector('.modal.active')?.remove();
  loadEmergencies();
}

// Logout
function logout() {
  if (confirm('ออกจากระบบ?')) {
    auth.signOut();
  }
}
