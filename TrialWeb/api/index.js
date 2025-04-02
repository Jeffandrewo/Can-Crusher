// index.js
const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // When deployed to Vercel, use environment variables
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };
} catch (error) {
  console.error("Error parsing Firebase credentials:", error);
}

// Track when we last sent notifications to avoid spamming
let lastNotificationTime = {
  bin1: 0,
  bin2: 0
};

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://toggle-6ce93-default-rtdb.firebaseio.com"
  });
}

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Function to check bin levels and send notifications if needed
async function checkBinLevels() {
  try {
    const database = admin.database();
    
    // Get the bin fill levels
    const bin1Snapshot = await database.ref('BinFillLevel1').once('value');
    const bin2Snapshot = await database.ref('BinFillLevel2').once('value');
    
    const bin1Level = bin1Snapshot.val();
    const bin2Level = bin2Snapshot.val();
    
    const currentTime = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds
    let messagesSent = false;
    
    // Check bin 1 level
    if (bin1Level >= 80 && (currentTime - lastNotificationTime.bin1) > tenMinutesInMs) {
      await sendSmsNotification(`⚠️ ALERT: Bin 1 is at ${Math.round(bin1Level)}% capacity. Please empty soon.`);
      lastNotificationTime.bin1 = currentTime;
      messagesSent = true;
      console.log(`Sent notification for Bin 1 at ${Math.round(bin1Level)}%`);
    }
    
    // Check bin 2 level
    if (bin2Level >= 80 && (currentTime - lastNotificationTime.bin2) > tenMinutesInMs) {
      await sendSmsNotification(`⚠️ ALERT: Bin 2 is at ${Math.round(bin2Level)}% capacity. Please empty soon.`);
      lastNotificationTime.bin2 = currentTime;
      messagesSent = true;
      console.log(`Sent notification for Bin 2 at ${Math.round(bin2Level)}%`);
    }
    
    return { success: true, messagesSent };
  } catch (error) {
    console.error("Error checking bin levels:", error);
    return { success: false, error: error.message };
  }
}

// Function to send SMS via Twilio
async function sendSmsNotification(message) {
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.RECIPIENT_PHONE_NUMBER
    });
    console.log(`Message sent with SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
}

// Handler for Vercel serverless function
module.exports = async (req, res) => {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const result = await checkBinLevels();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({ error: error.message });
  }
};