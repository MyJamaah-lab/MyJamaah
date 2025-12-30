import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { auth } from "./firebase";

export const ensureSignedIn = () =>
  new Promise<User>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          unsubscribe();
          resolve(user);
          return;
        }

        const cred = await signInAnonymously(auth);
        unsubscribe();
        resolve(cred.user);
      } catch (err) {
        unsubscribe();
        reject(err);
      }
    });
  });
