import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA_S4K3VpAVHU4KW1T1vIsA7tu9icrGaks",
    authDomain: "gestion-negocio-pro.firebaseapp.com",
    projectId: "gestion-negocio-pro",
    storageBucket: "gestion-negocio-pro.firebasestorage.app",
    messagingSenderId: "827486290467",
    appId: "1:827486290467:web:3df14c777fc93ab592a796"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'enbeb-erp-v1';
