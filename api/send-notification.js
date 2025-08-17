const admin = require("firebase-admin");

// This is sensitive information and should be stored in Vercel Environment Variables
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// The main function that Vercel will run
export default async function handler(req, res) {
  // We only want to handle POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Get the clipboard text and FCM token from the request body
  const { clipboardText, fcmToken } = req.body;

  // Basic validation
  if (!clipboardText || !fcmToken) {
    return res.status(400).json({ error: "Missing clipboardText or fcmToken in request body." });
  }

  // Construct the FCM message payload
  const payload = {
    token: fcmToken,
    data: {
      clipboardText: clipboardText, // This is the key your phone app will look for
    },
    android: {
      priority: "high",
    },
  };

  try {
    console.log(`Sending notification to token: ${fcmToken}`);
    const response = await admin.messaging().send(payload);
    console.log("Successfully sent message:", response);
    // Send a success response back to the Chrome extension
    return res.status(200).json({ success: true, messageId: response });

  } catch (error) {
    console.error("Error sending message:", error);
    // Send an error response back to the Chrome extension
    return res.status(500).json({ success: false, error: error.message });
  }
}