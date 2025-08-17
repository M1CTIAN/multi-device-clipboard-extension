// This file MUST be in the root of your project for Firebase to find it.

// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Use the same Firebase configuration as your main app
const firebaseConfig = {
    apiKey: "AIzaSyDzoPpsAradDUMiTHGj6GpygIq87sEVFWA",
    authDomain: "mcen-14838.firebaseapp.com",
    databaseURL: "https://mcen-14838-default-rtdb.firebaseio.com",
    projectId: "mcen-14838",
    storageBucket: "mcen-14838.firebasestorage.app",
    messagingSenderId: "34872421436",
    appId: "1:34872421436:web:f43a1412356d0af3e16739",
    measurementId: "G-PD6Z9K8Z8R"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// This handler is optional, but good practice to include.
// It allows you to handle notifications that arrive while your web app is in the background.
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize the notification here
  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new message.',
    icon: '/firebase-logo.png' // Optional: Add an icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});