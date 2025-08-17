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

    // This is the URL you will get after deploying your project to Vercel.
    // For local testing, it will be something like http://localhost:3000
    const VERCEL_API_URL = "https://multi-device-clipboard-extension.vercel.app/api/send-notification";

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "textCopied") {
            const handleCopy = async () => {
                const user = auth.currentUser;
                if (!user) {
                    console.log("No user logged in. Skipping.");
                    return;
                }

                try {
                    // --- Step 1: Save the item to Firestore for history ---
                    const historyPromise = db.collection("users").doc(user.uid).collection("clipboard").add({
                        text: message.text,
                        time: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // --- Step 2: Get the user's document to find the FCM token ---
                    const userDocPromise = db.collection("users").doc(user.uid).get();

                    // --- Run both operations in parallel for efficiency ---
                    const [_, userDoc] = await Promise.all([historyPromise, userDocPromise]);
                    console.log("Clipboard history saved.");

                    // --- Step 3: Check for token and call the Vercel API ---
                    if (userDoc.exists && userDoc.data().fcmToken) {
                        const fcmToken = userDoc.data().fcmToken;

                        const response = await fetch(VERCEL_API_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                clipboardText: message.text,
                                fcmToken: fcmToken
                            }),
                        });

                        // Check if the API call was successful
                        if (!response.ok) {
                            throw new Error(`API call failed with status: ${response.status}`);
                        }

                        const data = await response.json();
                        if (data.success) {
                            console.log('Successfully triggered notification via Vercel.');
                        } else {
                            console.error('Vercel API returned an error:', data.error);
                        }
                    } else {
                        console.log("User has no FCM token, skipping notification.");
                    }
                } catch (error) {
                    console.error('Error processing copied text:', error);
                }
            };

            handleCopy();
            return true; // Keep the message channel open for the async operations
        }
    });

} catch (e) {
    console.error("Error in background script:", e);
}