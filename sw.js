self.addEventListener('install', (event) => {
  console.log("Service Worker Installed");
});

self.addEventListener('activate', (event) => {
  console.log("Service Worker Activated");
});

// รับ notification event (optional, สำหรับ push notification)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // เปิดหน้าเว็บเมื่อคลิก notification
  );
});