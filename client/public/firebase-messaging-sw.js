/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDkTmGk7RfvcXZMX2A_-nlBF",
  authDomain: "naashah-8d07e.firebaseapp.com",
  projectId: "naashah-8d07e",
  storageBucket: "naashah-8d07e.firebasestorage.app",
  messagingSenderId: "499906855478",
  appId: "1:499906855478:web:89b3fc15797",
  measurementId: "G-3GXHPFGLV9"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message:", payload);

  const notificationTitle = payload.notification?.title || "نشأة";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    dir: "rtl",
    lang: "ar",
    tag: payload.data?.type || "default",
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = "/";

  // Use URL from data if available, otherwise route based on type
  if (data?.url) {
    url = data.url;
  } else if (data?.type === "attendance") {
    url = "/parent/attendance";
  } else if (data?.type === "daily_report") {
    url = "/parent/reports";
  } else if (data?.type === "message") {
    url = "/messages";
  } else if (data?.type === "invoice") {
    url = "/parent/invoices";
  } else if (data?.type === "media" || data?.type === "activity") {
    url = "/parent/photos";
  } else if (data?.type === "pickup" || data?.type === "pickup_alert") {
    url = "/staff/pickup";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});
