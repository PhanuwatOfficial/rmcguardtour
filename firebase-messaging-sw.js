importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDOhjzcF_MK3A4G7QcbsAO9CHVcu_qqMRc",
  authDomain: "orgn-94d81.firebaseapp.com",
  projectId: "orgn-94d81",
  messagingSenderId: "813852741670",
  appId: "1:813852741670:web:0ac4955492335a257996e7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon.png'
  });
});