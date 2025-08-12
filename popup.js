document.addEventListener('DOMContentLoaded', function () {
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

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const imageInput = document.getElementById('imageInput');
    const textInput = document.getElementById('textInput');
    const sendBtn = document.getElementById('sendBtn');
    const clipboardList = document.getElementById('clipboardList');

    async function compressImage(file) {
        const options = { maxWidthOrHeight: 800, maxSizeMB: 0.2, fileType: 'image/webp' };
        const compressedFile = await imageCompression(file, options);
        return await imageCompression.getDataUrlFromFile(compressedFile);
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

    logoutBtn.addEventListener("click", () => auth.signOut());

    sendBtn.addEventListener("click", async () => {
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
                time: Date.now()
            });
            textInput.value = "";
            imageInput.value = "";
        }
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
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
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            clipboardList.innerHTML = "<p>Please sign in to see your clipboard.</p>";
        }
    });
});