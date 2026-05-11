# Emergency Contacts - Code Examples & Reference

## 1. Load Contacts on Page Initialization
```javascript
// Call this when user navigates to emergency contacts tab
loadEmergencyContactsFromFirebase();

// Or set up to load when clicking the tab
document.querySelector('.nav-tab[data-tab="contactEmergency"]').addEventListener('click', () => {
    loadEmergencyContactsFromFirebase();
});
```

## 2. User Role Configuration

### Set Admin Role on Login
```javascript
// After successful login
const userData = {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    role: 'admin'  // or 'user'
};
localStorage.setItem('currentUser', JSON.stringify(userData));
```

### Check Current User Role
```javascript
function getCurrentUserRole() {
    try {
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
            const currentUserObj = JSON.parse(currentUserStr);
            return currentUserObj.role;
        }
    } catch (e) {
        console.error('Error reading user role:', e);
    }
    return null;
}
```

## 3. Add Contact Programmatically
```javascript
const newContact = {
    no: Math.max(...emergencyContacts.map(c => c.no || 0), 0) + 1,
    name: 'John Doe',
    position: 'Manager',
    phone: '086-1234567',
    extension: '101',
    internal: '201'
};

emergencyContacts.push(newContact);
await saveEmergencyContactsToFirebase();
renderEmergencyContacts();
```

## 4. Update Contact Programmatically
```javascript
const contactNo = 5;
const index = emergencyContacts.findIndex(c => c.no === contactNo);
if (index !== -1) {
    emergencyContacts[index] = {
        ...emergencyContacts[index],
        name: 'New Name',
        phone: '086-9999999'
    };
    await saveEmergencyContactsToFirebase();
    renderEmergencyContacts();
}
```

## 5. Delete Contact Programmatically
```javascript
const contactNo = 5;
emergencyContacts = emergencyContacts.filter(c => c.no !== contactNo);
await saveEmergencyContactsToFirebase();
renderEmergencyContacts();
```

## 6. Filter Contacts
```javascript
// Get all managers
const managers = emergencyContacts.filter(c => 
    c.position.includes('Manager')
);

// Search by name
function searchContact(searchTerm) {
    return emergencyContacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
}
```

## 7. Export to CSV
```javascript
function exportContactsToCSV() {
    let csv = 'No,Name,Position,Phone,Extension,Internal\\n';
    emergencyContacts.forEach(contact => {
        csv += `${contact.no},${contact.name},${contact.position},${contact.phone},${contact.extension},${contact.internal}\\n`;
    });
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', 'emergency_contacts.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
```

## 8. Get Contact Statistics
```javascript
function getContactStats() {
    return {
        totalContacts: emergencyContacts.length,
        departments: [...new Set(emergencyContacts.map(c => 
            c.position.split('/')[0]
        ))].length,
        withExtension: emergencyContacts.filter(c => c.extension).length
    };
}
```

## 9. Debug Utilities
```javascript
function debugEmergencyContacts() {
    console.log('Emergency Contacts:', emergencyContacts);
    console.log('Total Contacts:', emergencyContacts.length);
    console.log('Current User:', JSON.parse(localStorage.getItem('currentUser')));
}
```

## 10. Error Handling Pattern
```javascript
async function safeLoadContacts() {
    try {
        const snapshot = await firebase.database()
            .ref('emergencyContacts').once('value');
        if (snapshot.exists()) {
            emergencyContacts = snapshot.val();
        }
        renderEmergencyContacts();
    } catch (error) {
        console.error('Error loading contacts:', error);
        Swal.fire('Error', 'Failed to load contacts', 'error');
    }
}
```
