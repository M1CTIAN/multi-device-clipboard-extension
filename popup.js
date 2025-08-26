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
    const db = firebase.firestore();

    // --- Get HTML Elements ---
    const imageInput = document.getElementById('imageInput');
    const textInput = document.getElementById('textInput');
    const sendBtn = document.getElementById('sendBtn');
    const clipboardList = document.getElementById('clipboardList');
    const autoSyncToggle = document.getElementById('autoSyncToggle');
    const phoneNotifyToggle = document.getElementById('phoneNotifyToggle');
    const phoneNumberInput = document.getElementById('phoneNumberInput');

    // --- Automation Settings ---
    let autoClipboardSync = false;
    let phoneNotifications = false;
    let lastClipboardContent = '';
    let clipboardMonitorInterval;
    let syncInterval;
    let lastSyncTime = 0;

    // --- Helper Functions (Define first) ---
    function generateId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    function showNotification(message, color = '#28a745') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.className = 'notification';
        notification.style.background = color;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    async function compressImage(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                const MAX_SIZE = 800;
                let { width, height } = img;

                if (width > height && width > MAX_SIZE) {
                    height = (height * MAX_SIZE) / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width = (width * MAX_SIZE) / height;
                    height = MAX_SIZE;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/webp', 0.8));
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // --- Chrome Storage Functions ---
    async function saveClipboardItem(item) {
        // Also save to a dedicated 'latestItem' document in Firestore for the phone to listen to
        try {
            // This will overwrite the document each time, which is what we want for a live clipboard
            await db.collection('clipboard').doc('latest').set(item);
            console.log("Item saved to Firestore for phone sync.");
        } catch (error) {
            console.error("Could not save to Firestore:");
        }

        return new Promise((resolve) => {
            chrome.storage.sync.get(['clipboardItems'], (result) => {
                const items = result.clipboardItems || [];
                // Check if item already exists (avoid duplicates)
                if (!items.some(existing => existing.id === item.id)) {
                    items.unshift(item);
                    // Keep only last 20 items
                    const trimmedItems = items.slice(0, 20);
                    chrome.storage.sync.set({ clipboardItems: trimmedItems }, resolve);
                } else {
                    resolve();
                }
            });
        });
    }

    async function loadClipboardItems() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['clipboardItems'], (result) => {
                const items = result.clipboardItems || [];
                displayClipboardItems(items);
                resolve(items);
            });
        });
    }

    // --- Phone Sharing Functions ---
    window.shareToWhatsApp = function (text) {
        const phoneNumber = phoneNumberInput?.value;
        let url;
        if (phoneNumber && phoneNumber.trim()) {
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            url = `https://wa.me/${cleanPhone}?text=${text}`;
        } else {
            url = `https://wa.me/?text=${text}`;
        }
        chrome.tabs.create({ url: url });
        showNotification('📱 WhatsApp opened!', '#25D366');
    };

    window.shareToTelegram = function (text) {
        const url = `https://t.me/share/url?text=${text}`;
        chrome.tabs.create({ url: url });
        showNotification('✈️ Telegram opened!', '#0088cc');
    };

    window.shareToEmail = function (text) {
        const url = `mailto:?subject=Clipboard%20Content&body=${text}`;
        chrome.tabs.create({ url: url });
    };

    window.generateQRCode = function (text, itemId) {
        // Remove existing QR codes
        document.querySelectorAll('.qr-code-container').forEach(el => el.remove());

        const decodedText = decodeURIComponent(text);
        console.log('Generating QR code for:', decodedText.substring(0, 50) + '...');

        const qrContainer = document.createElement('div');
        qrContainer.className = 'qr-code-container';
        qrContainer.innerHTML = `
            <div class="qr-code-popup">
                <div class="qr-header">
                    <h3>📱 Scan with Phone</h3>
                    <button class="close-qr">✕</button>
                </div>
                <div id="qr-${itemId}" class="qr-code-display">
                    <div class="loading">Generating QR code...</div>
                </div>
                <div class="qr-text-preview">${decodedText.substring(0, 100)}${decodedText.length > 100 ? '...' : ''}</div>
                <p class="qr-instructions">
                    1. Open camera app on your phone<br>
                    2. Point camera at QR code<br>
                    3. Tap the notification/link to copy text
                </p>
            </div>
        `;

        qrContainer.querySelector('.close-qr').addEventListener('click', () => {
            qrContainer.remove();
        });

        document.body.appendChild(qrContainer);

        // Generate QR code using API
        const qrDisplay = document.getElementById(`qr-${itemId}`);
        const qrImg = document.createElement('img');
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(decodedText)}`;

        qrImg.onload = () => {
            qrDisplay.innerHTML = '';
            qrDisplay.appendChild(qrImg);
        };

        qrImg.onerror = () => {
            qrDisplay.innerHTML = '<div class="error">Failed to generate QR code</div>';
        };

        qrImg.src = qrUrl;
        qrImg.alt = 'QR Code';
    };

    window.instantShare = function (text, platform) {
        const phoneNumber = phoneNumberInput?.value;
        let url;

        switch (platform) {
            case 'whatsapp':
                if (phoneNumber && phoneNumber.trim()) {
                    const cleanPhone = phoneNumber.replace(/\D/g, '');
                    url = `https://wa.me/${cleanPhone}?text=${text}`;
                } else {
                    url = `https://wa.me/?text=${text}`;
                }
                break;
            case 'telegram':
                url = `https://t.me/share/url?text=${text}`;
                break;
        }

        if (url) {
            chrome.tabs.create({ url: url });
            showNotification(`✅ ${platform} opened!`, '#28a745');
        }
    };

    function generateInstantShareOptions(item) {
        const shareDiv = document.createElement('div');
        shareDiv.className = 'instant-share-options';

        const whatsappButton = document.createElement('button');
        whatsappButton.className = 'instant-share-btn';
        whatsappButton.title = 'Instant WhatsApp';
        whatsappButton.innerHTML = '<img src="icons/whatsapp_icon.png" alt="WhatsApp">';
        whatsappButton.addEventListener('click', () => instantShare(encodeURIComponent(item.text || ''), 'whatsapp'));
        shareDiv.appendChild(whatsappButton);

        const telegramButton = document.createElement('button');
        telegramButton.className = 'instant-share-btn';
        telegramButton.title = 'Instant Telegram';
        telegramButton.innerHTML = '<img src="icons/telegram_icon.png" alt="Telegram">';
        telegramButton.addEventListener('click', () => instantShare(encodeURIComponent(item.text || ''), 'telegram'));
        shareDiv.appendChild(telegramButton);

        const qrButton = document.createElement('button');
        qrButton.className = 'instant-share-btn';
        qrButton.title = 'QR Code';
        qrButton.innerHTML = '<img src="icons/qr_icon.png" alt="QR Code">';
        qrButton.addEventListener('click', () => generateQRCode(encodeURIComponent(item.text || ''), item.id));
        shareDiv.appendChild(qrButton);

        return shareDiv;
    }

    // --- Display Function ---
    function displayClipboardItems(items) {
        const list = document.getElementById('clipboardList');
        list.innerHTML = '';
        if (items.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p>No clipboard items yet. Add some content above!</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const div = document.createElement("div");
            div.className = 'clipboard-item';
            div.setAttribute('data-id', item.id);

            // Highlight new items
            if (item.time && item.time > lastSyncTime - 5000) {
                div.classList.add('new-item');
            }

            // Add auto-captured indicator
            if (item.auto) {
                div.classList.add('auto-item');
                const autoIndicator = document.createElement('img');
                autoIndicator.src = 'icons/auto_icon.png';
                autoIndicator.className = 'auto-indicator';
                autoIndicator.title = 'Auto-captured';
                div.appendChild(autoIndicator);
            }

            if (item.text) {
                const textElement = document.createElement('p');
                textElement.className = 'clipboard-text';
                textElement.textContent = item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text;
                textElement.title = 'Click to copy';
                
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-btn';
                copyButton.innerHTML = '<img src="icons/copy_icon.png" alt="Copy">';
                copyButton.title = 'Copy to clipboard';
                copyButton.onclick = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(item.text);
                    showNotification('Copied to clipboard!');
                };

                textElement.onclick = () => {
                    navigator.clipboard.writeText(item.text);
                    showNotification('Copied to clipboard!');
                };

                div.appendChild(textElement);
                div.appendChild(copyButton);
            } else if (item.type === 'image') {
                const img = document.createElement("img");
                img.src = item.image;
                img.className = 'clipboard-image';
                img.style.width = '150px';
                img.onclick = () => {
                    fetch(item.image)
                        .then(res => res.blob())
                        .then(blob => navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]))
                        .then(() => {
                            const confirmation = document.createElement('div');
                            confirmation.textContent = '🖼️ Image copied!';
                            confirmation.className = 'notification';
                            confirmation.style.background = '#17a2b8';
                            document.body.appendChild(confirmation);
                            setTimeout(() => confirmation.remove(), 1500);
                        })
                        .catch(e => {
                            console.log("Image copy not supported");
                            const error = document.createElement('div');
                            error.textContent = '❌ Image copy not supported';
                            error.className = 'notification';
                            error.style.background = '#dc3545';
                            document.body.appendChild(error);
                            setTimeout(() => error.remove(), 2000);
                        });
                };
                div.appendChild(img);
            }

            // Add timestamp
            const time = document.createElement("div");
            const timeAgo = getTimeAgo(item.time);
            time.className = 'clipboard-time';
            time.innerHTML = `
                <span>${new Date(item.time).toLocaleTimeString()}</span>
                <span>${timeAgo}</span>
            `;
            div.appendChild(time);

            list.appendChild(div);
        });
    }

    // --- Sync Functions ---
    function startPeriodicSync() {
        syncInterval = setInterval(async () => {
            const items = await loadClipboardItems();
            // Check if there are newer items from other devices
            if (items.length > 0) {
                const newestItemTime = Math.max(...items.map(item => item.time || 0));
                if (newestItemTime > lastSyncTime) {
                    lastSyncTime = newestItemTime;
                    // Visual indicator for new items
                    showNewItemsIndicator();
                }
            }
        }, 3000); // Sync every 3 seconds
    }

    function stopPeriodicSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
        }
    }

    function showNewItemsIndicator() {
        const indicator = document.createElement('div');
        indicator.textContent = '✨ New items synced!';
        indicator.className = 'notification';
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 2000);
    }

    // --- Clipboard Monitoring ---
    function startClipboardMonitoring() {
        clipboardMonitorInterval = setInterval(async () => {
            try {
                const clipboardText = await navigator.clipboard.readText();
                if (clipboardText && clipboardText !== lastClipboardContent && clipboardText.length > 0) {
                    lastClipboardContent = clipboardText;

                    // Auto-save to clipboard history
                    const newItem = {
                        text: clipboardText,
                        image: null,
                        time: Date.now(),
                        id: generateId(),
                        auto: true // Mark as auto-captured
                    };

                    await saveClipboardItem(newItem);
                    showAutoSaveNotification();

                    // Send phone notification if enabled
                    if (phoneNotifications) {
                        // This now uses the local popup, not the background service.
                        sendPhoneNotification(clipboardText);
                    }
                }
            } catch (error) {
                // Clipboard access denied - this is normal in some contexts
            }
        }, 2000); // Check every 2 seconds
    }

    function stopClipboardMonitoring() {
        if (clipboardMonitorInterval) {
            clearInterval(clipboardMonitorInterval);
        }
    }

    function showAutoSaveNotification() {
        const notification = document.createElement('div');
        notification.textContent = '🤖 Auto-saved to clipboard!';
        notification.className = 'notification auto-notification';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    // --- Phone Notifications ---
    async function sendPhoneNotification(text) {
        const phoneNumber = phoneNumberInput.value;
        if (!phoneNumber) return;

        // Generate notification options
        const options = [
            {
                name: 'WhatsApp',
                url: `https://wa.me/${phoneNumber}?text=${encodeURIComponent('🤖 New clipboard: ' + text.substring(0, 100) + (text.length > 100 ? '...' : ''))}`,
                icon: '📱'
            },
            {
                name: 'Telegram',
                url: `https://t.me/share/url?text=${encodeURIComponent('🤖 New clipboard: ' + text)}`,
                icon: '✈️'
            }
        ];

        // Show notification popup
        showPhoneNotificationPopup(text, options);
    }

    function showPhoneNotificationPopup(text, options) {
        const popup = document.createElement('div');
        popup.className = 'phone-notification-popup';

        const content = document.createElement('div');
        content.className = 'notification-content';

        const header = document.createElement('div');
        header.className = 'notification-header';
        header.innerHTML = '<span>📱 Send to Phone?</span>';
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.addEventListener('click', () => popup.remove());
        header.appendChild(closeButton);
        content.appendChild(header);

        const textPreview = document.createElement('div');
        textPreview.className = 'notification-text';
        textPreview.textContent = `${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
        content.appendChild(textPreview);

        const actions = document.createElement('div');
        actions.className = 'notification-actions';

        options.forEach(option => {
            const button = document.createElement('button');
            button.innerHTML = `${option.icon} ${option.name}`;
            button.addEventListener('click', () => {
                chrome.tabs.create({ url: option.url });
                popup.remove();
            });
            actions.appendChild(button);
        });

        const skipButton = document.createElement('button');
        skipButton.className = 'skip-btn';
        skipButton.textContent = 'Skip';
        skipButton.addEventListener('click', () => popup.remove());
        actions.appendChild(skipButton);

        content.appendChild(actions);
        popup.appendChild(content);
        document.body.appendChild(popup);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (popup.parentNode) popup.remove();
        }, 10000);
    }

    // --- Event Listeners ---
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.clipboardItems) {
            displayClipboardItems(changes.clipboardItems.newValue || []);
        }
    });

    if (sendBtn) sendBtn.addEventListener("click", async () => {
        const text = textInput.value;
        let imgBase64 = null;

        if (imageInput.files.length > 0) {
            try {
                imgBase64 = await compressImage(imageInput.files[0]);
            } catch (error) {
                console.error("Image compression failed:", error);
                return;
            }
        }

        if (text || imgBase64) {
            const newItem = {
                text: text || null,
                image: imgBase64 || null,
                time: Date.now(),
                id: generateId() // Now generateId is properly defined
            };
            await saveClipboardItem(newItem);
            textInput.value = "";
            imageInput.value = "";
            lastSyncTime = newItem.time; // Update last sync time
        }
    });

    if (autoSyncToggle) autoSyncToggle.addEventListener('change', (e) => {
        autoClipboardSync = e.target.checked;
        chrome.storage.sync.set({ autoSync: autoClipboardSync });

        if (autoClipboardSync) {
            startClipboardMonitoring();
            showNotification('🤖 Auto-sync enabled!', '#28a745');
        } else {
            stopClipboardMonitoring();
            showNotification('⏹️ Auto-sync disabled', '#6c757d');
        }
    });

    if (phoneNotifyToggle) phoneNotifyToggle.addEventListener('change', (e) => {
        phoneNotifications = e.target.checked;
        chrome.storage.sync.set({ phoneNotify: phoneNotifications });

        if (phoneNotifications) {
            showNotification('📱 Phone notifications enabled!', '#17a2b8');
        } else {
            showNotification('🔕 Phone notifications disabled', '#6c757d');
        }
    });

    if (phoneNumberInput) phoneNumberInput.addEventListener('input', (e) => {
        chrome.storage.sync.set({ phoneNumber: e.target.value });
    });

    // --- Initialize ---
    loadClipboardItems().then(items => {
        if (items.length > 0) {
            lastSyncTime = Math.max(...items.map(item => item.time || 0));
        }
    });

    if (autoSyncToggle) {
        chrome.storage.sync.get(['autoSync', 'phoneNotify', 'phoneNumber'], (result) => {
            autoClipboardSync = result.autoSync || false;
            phoneNotifications = result.phoneNotify || false;
            autoSyncToggle.checked = autoClipboardSync;
            if (phoneNotifyToggle) phoneNotifyToggle.checked = phoneNotifications;
            if (phoneNumberInput) phoneNumberInput.value = result.phoneNumber || '';

            if (autoClipboardSync) {
                startClipboardMonitoring();
            }
        });
    }

    startPeriodicSync();

    // Cleanup on popup close
    window.addEventListener('beforeunload', () => {
        stopPeriodicSync();
        stopClipboardMonitoring();
    });
});
