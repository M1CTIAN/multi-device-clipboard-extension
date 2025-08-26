// Import Firebase scripts
try {
    importScripts(
        'libs/firebase-app-compat.js',
        'libs/firebase-auth-compat.js',
        'libs/firebase-firestore-compat.js'
    );

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

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Vercel API URL is no longer needed.

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "textCopied") {
            // The logic for sending a push notification has been removed for simplification.
            // You can add items to a shared collection here if needed in the future.
            console.log("Text copied:", message.text);
        }
    });

} catch (e) {
    console.error("Error in background script:", e);
}