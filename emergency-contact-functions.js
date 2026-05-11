// ============================================================
// Emergency Contact Management - Firebase Integration
// ============================================================

// Load emergency contacts from Firebase
async function loadEmergencyContactsFromFirebase() {
    try {
        const snapshot = await firebase.database().ref('emergencyContacts').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            emergencyContacts = Array.isArray(data) ? data : Object.values(data);
            emergencyContacts.sort((a, b) => a.no - b.no);
        }
        renderEmergencyContacts();
    } catch (error) {
        console.error('Error loading emergency contacts:', error);
    }
}

// Save emergency contacts to Firebase
async function saveEmergencyContactsToFirebase() {
    try {
        await firebase.database().ref('emergencyContacts').set(emergencyContacts);
        return true;
    } catch (error) {
        console.error('Error saving emergency contacts:', error);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้', 'error');
        return false;
    }
}

// Show modal to add new emergency contact
function showAddEmergencyContactModal() {
    Swal.fire({
        title: 'เพิ่มผู้ติดต่อใหม่',
        html: `
            <div style="text-align: left;">
                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">ชื่อ:</label>
                    <input type="text" id="newContactName" class="form-control" placeholder="กรอกชื่อ" />
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">ตำแหน่ง:</label>
                    <input type="text" id="newContactPosition" class="form-control" placeholder="กรุณากรอกตำแหน่ง" />
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">เบอร์โทร:</label>
                    <input type="text" id="newContactPhone" class="form-control" placeholder="กรอกเบอร์โทร" />
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">เบอร์ต่อ (ไม่บังคับ):</label>
                    <input type="text" id="newContactExtension" class="form-control" placeholder="กรอกเบอร์ต่อ" />
                </div>
                <div>
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">เบอร์ภายใน:</label>
                    <input type="text" id="newContactInternal" class="form-control" placeholder="กรอกเบอร์ภายใน" />
                </div>
            </div>
        `,
        confirmButtonText: 'เพิ่ม',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        confirmButtonColor: '#3562dcff',
        cancelButtonColor: '#6c757d',
        didOpen: () => {
            document.getElementById('newContactName').focus();
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const name = document.getElementById('newContactName').value.trim();
            const position = document.getElementById('newContactPosition').value.trim();
            const phone = document.getElementById('newContactPhone').value.trim();
            const extension = document.getElementById('newContactExtension').value.trim();
            const internal = document.getElementById('newContactInternal').value.trim();

            if (!name || !position || !phone) {
                Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อ ตำแหน่ง และเบอร์โทร', 'error');
                return;
            }

            const newNo = Math.max(...emergencyContacts.map(c => c.no || 0), 0) + 1;
            const newContact = { no: newNo, name, position, phone, extension, internal };
            emergencyContacts.push(newContact);
            
            saveEmergencyContactsToFirebase().then(() => {
                renderEmergencyContacts();
                Swal.fire({
                    title: 'สำเร็จ',
                    text: 'เพิ่มผู้ติดต่อใหม่สำเร็จ',
                    icon: 'success',
                    confirmButtonColor: '#3562dcff'
                });
            });
        }
    });
}

// Show modal to edit emergency contact
function showEditEmergencyContactModal(contactNo) {
    const contact = emergencyContacts.find(c => c.no === contactNo);
    if (!contact) return;

    Swal.fire({
        title: 'แก้ไขผู้ติดต่อ',
        html: `
            <div style="text-align: left;">
                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">ชื่อ:</label>
                    <input type="text" id="editContactName" class="form-control" value="${contact.name}" />
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">ตำแหน่ง:</label>
                    <input type="text" id="editContactPosition" class="form-control" value="${contact.position}" placeholder="กรุณากรอกตำแหน่ง" />
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">เบอร์โทร:</label>
                    <input type="text" id="editContactPhone" class="form-control" value="${contact.phone}" />
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">เบอร์ต่อ (ไม่บังคับ):</label>
                    <input type="text" id="editContactExtension" class="form-control" value="${contact.extension || ''}" />
                </div>
                <div>
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">เบอร์ภายใน:</label>
                    <input type="text" id="editContactInternal" class="form-control" value="${contact.internal}" />
                </div>
            </div>
        `,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        confirmButtonColor: '#3562dcff',
        cancelButtonColor: '#6c757d',
        didOpen: () => {
            document.getElementById('editContactName').focus();
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const name = document.getElementById('editContactName').value.trim();
            const position = document.getElementById('editContactPosition').value.trim();
            const phone = document.getElementById('editContactPhone').value.trim();
            const extension = document.getElementById('editContactExtension').value.trim();
            const internal = document.getElementById('editContactInternal').value.trim();

            if (!name || !position || !phone) {
                Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อ ตำแหน่ง และเบอร์โทร', 'error');
                return;
            }

            const index = emergencyContacts.findIndex(c => c.no === contactNo);
            if (index !== -1) {
                emergencyContacts[index] = { no: contactNo, name, position, phone, extension, internal };
                saveEmergencyContactsToFirebase().then(() => {
                    renderEmergencyContacts();
                    Swal.fire({
                        title: 'สำเร็จ',
                        text: 'แก้ไขผู้ติดต่อสำเร็จ',
                        icon: 'success',
                        confirmButtonColor: '#3562dcff'
                    });
                });
            }
        }
    });
}

// Delete emergency contact
function deleteEmergencyContact(contactNo) {
    const contact = emergencyContacts.find(c => c.no === contactNo);
    if (!contact) return;

    Swal.fire({
        title: 'ยืนยันการลบ',
        text: `ต้องการลบ ${contact.name} หรือไม่?`,
        icon: 'warning',
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d'
    }).then((result) => {
        if (result.isConfirmed) {
            emergencyContacts = emergencyContacts.filter(c => c.no !== contactNo);
            saveEmergencyContactsToFirebase().then(() => {
                renderEmergencyContacts();
                Swal.fire({
                    title: 'สำเร็จ',
                    text: 'ลบผู้ติดต่อสำเร็จ',
                    icon: 'success',
                    confirmButtonColor: '#3562dcff'
                });
            });
        }
    });
}
