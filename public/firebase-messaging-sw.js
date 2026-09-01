importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuración de Firebase pública para el SW
const firebaseConfig = {
  apiKey: "AIzaSyAEwCVdxgKGnRqtx2njenkuZk1J_g10lpA",
  authDomain: "rela-assitent.firebaseapp.com",
  projectId: "rela-assitent",
  storageBucket: "rela-assitent.firebasestorage.app",
  messagingSenderId: "37483330582",
  appId: "1:37483330582:web:a667ddeda4f26cbe9e0937"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
