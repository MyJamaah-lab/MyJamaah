import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCG4eyEvueSvBuBcuUUFEPGII3N12lveG4",
  authDomain: "myjamaah-9e6fc.firebaseapp.com",
  projectId: "myjamaah-9e6fc",
  storageBucket: "myjamaah-9e6fc.firebasestorage.app",
  messagingSenderId: "422409856222",
  appId: "1:422409856222:web:2c45b4690c5f1c67224e4f",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
