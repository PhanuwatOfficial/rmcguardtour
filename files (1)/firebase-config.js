// firebase-config.js
// ⚠️ อย่าลืมเปลี่ยนค่า config เป็นของคุณเอง

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxx"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export references
const auth = firebase.auth();
const database = firebase.database();

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
  cloudName: 'YOUR_CLOUD_NAME',
  uploadPreset: 'YOUR_UPLOAD_PRESET' // สร้างใน Cloudinary Dashboard (Unsigned)
};

console.log('✅ Firebase initialized');
