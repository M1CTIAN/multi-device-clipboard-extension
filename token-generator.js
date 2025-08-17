// --- Firebase Configuration ---
// This should be the same config as in your extension
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

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// --- Get HTML Elements ---
const getTokenBtn = document.getElementById('getTokenBtn');
const tokenDisplay = document.getElementById('tokenDisplay');

// --- Event Listener ---
getTokenBtn.addEventListener('click', async () => {
    try {
        // 1. Request permission from the user to show notifications
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            tokenDisplay.textContent = 'Notification permission was not granted.';
            console.log('Notification permission not granted.');
            return;
        }
        
        console.log('Notification permission granted.');

        // 2. Get the VAPID key you generated in the Firebase console
        const vapidKey = "BAND9mjjfGGL3M9UOjNOh6LUtl2sMynG7ay5_U903lRHLkAX1YPanTZGtL_BVIn6yiy_nV4xmQ68JXcMcIHKXW0";

        // 3. Get the device's registration token
        console.log('Requesting token...');
        const token = await messaging.getToken({ vapidKey: vapidKey });

        if (token) {
            console.log('FCM Token:', token);
            tokenDisplay.textContent = token;
            
            // Make the token text selectable and easy to copy
            tokenDisplay.style.userSelect = "all";
            tokenDisplay.style.cursor = "pointer";
            tokenDisplay.onclick = () => {
                navigator.clipboard.writeText(token)
                    .then(() => alert('Token copied to clipboard!'))
                    .catch(err => console.error('Failed to copy token: ', err));
            };

        } else {
            // This can happen if the browser doesn't support push notifications
            // or if something is blocking the service worker.
            tokenDisplay.textContent = 'No registration token available. Please ensure you are on a secure (HTTPS) connection and that push notifications are not blocked.';
            console.log('No registration token available.');
        }
    } catch (err) {
        // Log and display any errors
        tokenDisplay.textContent = 'An error occurred while retrieving token. Check the console for details.';
        console.error('An error occurred while retrieving token. ', err);
    }
});