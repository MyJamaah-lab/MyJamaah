import { signInAnonymously, User } from "firebase/auth";
import { auth } from "./firebase";

export async function ensureSignedIn(): Promise<User> {
  // If we already have a user, reuse it (prevents new UID on fast refresh)
  if (auth.currentUser) return auth.currentUser;

  // Otherwise sign in anonymously
  const cred = await signInAnonymously(auth);
  return cred.user;
}
