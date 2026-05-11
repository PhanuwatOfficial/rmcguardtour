# Emergency Contacts Management - Update Summary

## Changes Made

### 1. **Updated `renderEmergencyContacts()` Function**
   - Added admin role detection using `localStorage.currentUser`
   - Admins with `role === 'admin'` can now see add/edit/delete buttons
   - Added button to display "Add New Contact" for admins
   - Display responsive design:
     - **Desktop** (width > 700px): Table view with edit/delete buttons
     - **Mobile**: Card view with action buttons

### 2. **Changed Emergency Contacts Storage**
   - Changed from hardcoded array to dynamic variable: `let emergencyContacts = [...]`
   - Allows data to be saved to Firebase and reloaded

### 3. **Added Firebase Integration Functions**

#### `loadEmergencyContactsFromFirebase()`
- Loads emergency contacts from Firebase Realtime Database
- Path: `emergencyContacts/` 
- Falls back to default data if none exist
- Automatically sorts by `no` field
- Renders the contacts after loading

#### `saveEmergencyContactsToFirebase()`
- Saves the entire `emergencyContacts` array to Firebase
- Returns true on success, false on failure
- Called after each add/edit/delete operation

### 4. **Added Admin Modal Functions**

#### `showAddEmergencyContactModal()`
- Opens SweetAlert2 modal for adding new contact
- Fields: Name, Position, Phone, Extension (optional), Internal
- Validates required fields (Name, Position, Phone)
- Auto-generates next `no` value
- Saves to Firebase and re-renders on success

#### `showEditEmergencyContactModal(contactNo)`
- Opens SweetAlert2 modal to edit existing contact
- Pre-fills all current contact data
- Updates the contact in Firebase
- Re-renders the contact list on success

#### `deleteEmergencyContact(contactNo)`
- Shows confirmation dialog before deletion
- Removes contact from array
- Saves changes to Firebase
- Re-renders the contact list

## How to Use

### For Regular Users
- View emergency contacts in read-only mode
- Click phone number to make a call
- No edit/delete buttons visible

### For Admin Users (role = 'admin')
1. **Add Contact**: Click "เพิ่มผู้ติดต่อ" button
   - Fill in all required fields
   - Click "Add" to save to database

2. **Edit Contact**: Click "แก้ไข" button on any contact
   - Modify any field
   - Click "Save" to update in database

3. **Delete Contact**: Click "ลบ" button on any contact
   - Confirm the deletion
   - Contact is removed from database

## Firebase Database Structure

```
emergencyContacts/
├── [0]
│   ├── no: 1
│   ├── name: "Name"
│   ├── position: "Position"
│   ├── phone: "086-XXXX"
│   ├── extension: "123" (or empty string)
│   └── internal: "103"
├── [1]
│   └── ...
└── [n]
    └── ...
```

## Admin Role Detection

The system checks for admin status using:
```javascript
const currentUserObj = JSON.parse(localStorage.getItem('currentUser'));
const isAdmin = currentUserObj && (currentUserObj.role === 'admin');
```

Make sure your login system stores user data in localStorage with the structure:
```json
{
  "uid": "user-id",
  "name": "User Name",
  "role": "admin",  // or "user"
  "email": "email@domain.com"
}
```

## Notes

- All changes are automatically saved to Firebase
- Default emergency contacts are pre-loaded if none exist in Firebase
- The contact list is responsive and works on both desktop and mobile
- Admins can manage contacts in real-time
- All changes are persisted in Firebase Realtime Database

## Required Firebase Setup

Make sure Firebase is properly initialized in your HTML with:
- Firebase Database enabled
- Proper security rules allowing admins to read/write to `emergencyContacts/`

Example Firebase Rules:
```json
{
  "rules": {
    "emergencyContacts": {
      ".read": true,
      ".write": "root.child('admins').child(auth.uid).exists()"
    }
  }
}
```
