# Emergency Contacts Management - Quick Start Guide

## Features Implemented

### ✅ Admin Management System
- **Add Contacts**: Admins can add new emergency contacts
- **Edit Contacts**: Admins can modify existing contact information  
- **Delete Contacts**: Admins can remove contacts with confirmation
- **Firebase Integration**: All changes are saved to Firebase Realtime Database

### ✅ Responsive UI
- **Desktop View**: Table format with action buttons
- **Mobile View**: Card format with responsive buttons
- **Role-Based Display**: Only admins see edit/delete buttons

## Setup Instructions

### 1. Ensure Admin Users are Configured
Make sure your login system sets the user role in localStorage:
```javascript
localStorage.setItem('currentUser', JSON.stringify({
    uid: 'user-id',
    name: 'Admin Name',
    role: 'admin',  // This must be 'admin' for emergency contacts management
    email: 'admin@example.com'
}));
```

### 2. Firebase Configuration
The system uses the existing Firebase setup. Make sure:
- Firebase Realtime Database is enabled
- `emergencyContacts` collection is accessible
- Admin users have write permissions

### 3. Load Contacts on Page Load
Call this function when your app initializes or when users navigate to the emergency contacts tab:
```javascript
loadEmergencyContactsFromFirebase();
```

## How Admin Operations Work

### Adding a Contact
1. Admin clicks "เพิ่มผู้ติดต่อ" button
2. Modal opens with form fields:
   - **Name** (required)
   - **Position** (required)
   - **Phone** (required)
   - **Extension** (optional)
   - **Internal** (required)
3. Click "Add" to save
4. Data is automatically saved to Firebase
5. Contact list refreshes with new contact

### Editing a Contact
1. Admin clicks "แก้ไข" button on a contact
2. Modal opens with pre-filled data
3. Modify any field as needed
4. Click "Save" to update
5. Changes are saved to Firebase
6. Contact list refreshes

### Deleting a Contact
1. Admin clicks "ลบ" button on a contact
2. Confirmation dialog appears
3. Click "Delete" to confirm
4. Contact is removed from Firebase
5. Contact list refreshes

## Regular User Experience

Regular users (non-admin) see:
- ✅ View all emergency contacts
- ✅ Click phone numbers to make calls
- ❌ No add/edit/delete buttons
- ❌ No ability to modify contacts

## Firebase Data Structure

Each contact is stored as:
```javascript
{
    no: 1,           // Unique contact number (auto-generated)
    name: "Name",    // Contact's name
    position: "Position",  // Job title/position
    phone: "086-XXXX",     // Phone number
    extension: "123",      // Extension (can be empty)
    internal: "103"        // Internal phone number
}
```

## Troubleshooting

### Contacts not showing up
- Check that `loadEmergencyContactsFromFirebase()` is called
- Verify Firebase credentials are correct
- Check browser console for errors

### Add/Edit/Delete buttons not visible
- Verify user's role is set to 'admin' in localStorage
- Check `currentUser` object format
- Refresh the page

### Changes not saving to Firebase
- Check Firebase Realtime Database permissions
- Verify network connectivity
- Check browser console for error messages

### Modal not opening
- Verify SweetAlert2 is loaded
- Check browser console for JavaScript errors
- Ensure DOM elements exist (contact-table-body, contact-card-view)

## Code Functions Reference

### Load Contacts
```javascript
loadEmergencyContactsFromFirebase()
```

### Save Contacts
```javascript
saveEmergencyContactsToFirebase()
```

### Show Add Modal
```javascript
showAddEmergencyContactModal()
```

### Show Edit Modal
```javascript
showEditEmergencyContactModal(contactNo)
```

### Delete Contact
```javascript
deleteEmergencyContact(contactNo)
```

### Render Contacts
```javascript
renderEmergencyContacts()
```

## Default Emergency Contacts

If no contacts exist in Firebase, the system loads 18 default contacts including:
- Managers from various departments
- Department heads
- Security office contact

These defaults can be modified in the `emergencyContacts` array initialization.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Firebase connection
3. Ensure user has 'admin' role set
4. Check EMERGENCY_CONTACTS_UPDATE.md for detailed documentation
