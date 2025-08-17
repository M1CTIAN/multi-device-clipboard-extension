// This file MUST be in the root of your project for Firebase to find it.

// UPDATED: Import the Firebase scripts from the local libs folder
// Note: The service worker uses the non-compat versions of the file names.
// This is correct and expected.
importScripts('/libs/firebase-app-compat.js');
importScripts('/libs/firebase-messaging-compat.js');

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
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new message.',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});