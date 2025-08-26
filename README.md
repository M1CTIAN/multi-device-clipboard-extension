# Multi-Device Clipboard Sync Extension

A Chrome extension to seamlessly sync your clipboard content between your desktop browser and any mobile device using Firebase and a simple receiver web page.

## Features

-   **Real-Time Sync:** Instantly send text or images from your computer to your phone.
-   **Auto-Sync:** Automatically captures text you copy on your computer and syncs it.
-   **Manual Sync:** Manually send text or images through the extension popup.
-   **Phone Clipboard Integration:** A companion receiver page allows you to copy synced items to your phone's clipboard with a single tap.
-   **QR Code Sharing:** Quickly share text by generating a QR code.
-   **Direct Sharing:** Buttons to instantly share content to WhatsApp or Telegram.

## How It Works

The project uses a simple but powerful architecture:

1.  **Chrome Extension:** The extension, running on your desktop, captures clipboard items.
2.  **Firebase Firestore:** It acts as a real-time cloud database. The extension writes the latest clipboard item to a specific document in Firestore.
3.  **Receiver Web Page:** A simple HTML page, hosted online or run locally, that you open on your phone. It listens for real-time updates to the Firestore document and displays the new content, allowing you to copy it to your phone's clipboard.

```
[Chrome Extension] ---> [Firebase Firestore] <--- [Receiver Page on Phone]
```

## Setup Instructions

### Prerequisites

-   A Google account to use [Firebase](https://firebase.google.com/).
-   [Node.js](https://nodejs.org/) installed on your computer (to use `npx`).
-   [Git](https://git-scm.com/) installed (which includes `openssl` for local testing).

### 1. Firebase Project Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  In your new project, go to **Build > Firestore Database** and click **"Create database"**. Start in **test mode** for now.
3.  Go to your **Project Settings** (click the gear icon) and under the "General" tab, scroll down to "Your apps".
4.  Click the web icon (`</>`) to create a new web app.
5.  Give it a nickname and click "Register app".
6.  Firebase will provide you with a `firebaseConfig` object. **Copy this object.**

### 2. Configure the Extension and Receiver

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/M1CTIAN/multi-device-clipboard-extension.git
    cd multi-device-clipboard-extension
    ```
2.  **Update `popup.js`:** Open `popup.js` and replace the placeholder `firebaseConfig` object at the top with the one you copied from your Firebase project.
3.  **Update `receiver.html`:** Open `receiver.html` and do the same—replace the placeholder `firebaseConfig` with your own.

### 3. Set Firestore Security Rules

This is a critical step to allow the receiver page to read data.
1.  In your Firebase project, go to the **Firestore Database** section.
2.  Click on the **"Rules"** tab.
3.  Replace the entire content with the following rule and click **"Publish"**:
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow public read/write access to the clipboard collection
        match /clipboard/{docId} {
          allow read, write: if true;
        }
      }
    }
    ```

### 4. Load the Chrome Extension

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **"Developer mode"** in the top-right corner.
3.  Click **"Load unpacked"** and select the project folder.
4.  Pin the "ClipSync" extension to your toolbar for easy access.

## Usage

### On Your Computer

-   Click the extension icon to open the popup.
-   Type text or add an image and click **Send**.
-   Toggle **Auto-Sync** to automatically capture any text you copy.
-   Use the share buttons on any history item to generate a QR code or send to other apps.

### On Your Phone (Two Options)

#### Option 1: Deploying for Public Access (Recommended)

1.  Create a free account on a service like [Netlify](https://www.netlify.com/).
2.  Drag and drop your entire project folder onto the Netlify "Sites" page.
3.  Netlify will give you a public URL (e.g., `https://your-site.netlify.app`).
4.  On your phone's browser, navigate to **`https://your-site.netlify.app/receiver.html`**.
5.  Bookmark this URL on your phone's home screen for quick access.

#### Option 2: Local Testing (for Development)

1.  **Generate SSL Certificates:** In your project folder, run this command in a **Git Bash** terminal to create `key.pem` and `cert.pem` files. Press Enter for all the prompts.
    ```bash
    openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
    ```
2.  **Start the HTTPS Server:** Run this command in your project folder:
    ```bash
    npx http-server -S -p 8080
    ```
3.  **Access on Your Phone:** The server will give you an `https://192.168.x.x:8080` URL. On your phone (on the same Wi-Fi), navigate to `https://192.168.x.x:8080/receiver.html`. You will need to accept the browser's security warning to proceed.

Now, whenever you send an item from your extension, the receiver page on your phone will update, allowing you to tap a button to copy the content to your phone's clipboard.