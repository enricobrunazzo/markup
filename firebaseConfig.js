import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyD8-Z-x9zEIZJpgemwgVOhELVURjzVDoWA",
  authDomain: "markup-enr.firebaseapp.com",
  projectId: "markup-enr",
  storageBucket: "markup-enr.firebasestorage.app",
  messagingSenderId: "32509586403",
  appId: "1:32509586403:web:2de0bcc3ea2ce1a0194ed6"
};

const app = initializeApp(firebaseConfig);

export default app;
