import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDkTmGk7RfvcXZMX2A_-nlBF",
  authDomain: "naashah-8d07e.firebaseapp.com",
  projectId: "naashah-8d07e",
  storageBucket: "naashah-8d07e.firebasestorage.app",
  messagingSenderId: "499906855478",
  appId: "1:499906855478:web:89b3fc15797",
  measurementId: "G-3GXHPFGLV9"
};

const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

// Only initialize messaging in supported browsers
if (typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window) {
  messaging = getMessaging(app);
}

const VAPID_KEY = "BILHq8C3f4myRjdqGoUifPuw_MdHRSjUoOU_u7-zt0VTXKSmdJEjzxQwwmXphHVWcwD1pnmQspiVpQEDQoQHKF8";

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (!messaging) {
      console.warn("Firebase messaging not supported in this browser");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

export { messaging };
