window.addEventListener('load', () => {
    console.log("Window 'load' event fired. Checking for firebase object.");

    // First, check if the firebase object actually exists.
    if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
        console.error("FATAL: The Firebase library did not load correctly before this script ran.");
        const tokenDisplay = document.getElementById('tokenDisplay');
        if(tokenDisplay) {
            tokenDisplay.textContent = "Error: Firebase library failed to load. Please check your network connection and disable any ad-blockers that might be blocking gstatic.com.";
        }
        return; // Stop execution if Firebase isn't ready
    }

    console.log("Firebase is defined. Proceeding with initialization.");

    // --- Firebase Configuration ---
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
                tokenDisplay.textContent = 'No registration token available. Ensure you are on HTTPS and notifications are not blocked.';
            }
        } catch (err) {
            // Log and display any errors
            tokenDisplay.textContent = 'An error occurred while retrieving token. Check the console.';
            console.error('An error occurred while retrieving token. ', err);
        }
    });

    console.log("Event listener for 'getTokenBtn' has been attached.");
});