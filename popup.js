document.addEventListener('DOMContentLoaded', function () {
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
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- Get HTML Elements ---
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const imageInput = document.getElementById('imageInput');
    const textInput = document.getElementById('textInput');
    const sendBtn = document.getElementById('sendBtn');
    const clipboardList = document.getElementById('clipboardList');
    const settingsDiv = document.getElementById('settings');
    const fcmTokenInput = document.getElementById('fcmTokenInput');
    const saveTokenBtn = document.getElementById('saveTokenBtn');

    // --- Event Listeners ---

    if (!loginBtn) {
        console.error('loginBtn not found in DOM');
        return;
    }
    loginBtn.addEventListener("click", () => {
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
            if (chrome.runtime.lastError || !token) {
                console.error("Could not get auth token:", chrome.runtime.lastError.message || chrome.runtime.lastError);
                return;
            }
            const credential = firebase.auth.GoogleAuthProvider.credential(null, token);
            auth.signInWithCredential(credential)
                .catch(error => {
                    console.error("Firebase sign-in error:", error);
                });
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => auth.signOut());
    } else {
        console.warn('logoutBtn not found');
    }

    if (sendBtn) sendBtn.addEventListener("click", async () => {
        const text = textInput.value;
        let imgBase64 = null;

        if (imageInput.files.length > 0) {
            try {
                imgBase64 = await compressImage(imageInput.files[0]);
            } catch (error) {
                console.error("Image compression failed. Make sure the library is loaded.", error);
                return;
            }
        }

        const user = auth.currentUser;
        if (user) {
            await db.collection("users").doc(user.uid).collection("clipboard").add({
                text: text || null,
                image: imgBase64 || null,
                time: firebase.firestore.FieldValue.serverTimestamp()
            });
            textInput.value = "";
            imageInput.value = "";
        }
    });

    if (saveTokenBtn) saveTokenBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        const token = fcmTokenInput.value;
        if (user && token) {
            const userDocRef = db.collection("users").doc(user.uid);
            userDocRef.set({ fcmToken: token }, { merge: true })
                .then(() => console.log("FCM Token saved!"))
                .catch(e => console.error("Error saving token:", e));
        }
    });


    // --- Auth State Change Handler ---

    auth.onAuthStateChanged(user => {
        if (user) {
            // --- User is signed in ---
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            settingsDiv.style.display = 'block';

            const userDocRef = db.collection("users").doc(user.uid);

            // Load existing FCM token
            userDocRef.get().then(doc => {
                if (doc.exists && doc.data().fcmToken) {
                    fcmTokenInput.value = doc.data().fcmToken;
                }
            });

            // Listen for clipboard changes
            db.collection("users").doc(user.uid).collection("clipboard")
                .orderBy("time", "desc").limit(20)
                .onSnapshot(snapshot => {
                    clipboardList.innerHTML = "";
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const div = document.createElement("div");
                        if (data.text) {
                            const t = document.createElement("p");
                            t.textContent = data.text;
                            t.onclick = () => navigator.clipboard.writeText(data.text);
                            div.appendChild(t);
                        }
                        if (data.image) {
                            const img = document.createElement("img");
                            img.src = data.image;
                            img.width = 150;
                            div.appendChild(img);
                        }
                        clipboardList.appendChild(div);
                    });
                });
        } else {
            // --- User is signed out ---
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            settingsDiv.style.display = 'none';
            clipboardList.innerHTML = "<p>Please sign in to see your clipboard.</p>";
        }
    });

    // --- Helper Functions ---
    async function compressImage(file) {
        const options = { maxWidthOrHeight: 800, maxSizeMB: 0.2, fileType: 'image/webp' };
        const compressedFile = await imageCompression(file, options);
        return await imageCompression.getDataUrlFromFile(compressedFile);
    }
});
