import { db } from "./firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export type InviteDoc = {
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  place: string;
  mins: number;
  createdAt: any;
  status: "sent" | "accepted" | "declined";
};

export async function sendInviteToFirestore(invite: Omit<InviteDoc, "createdAt" | "status">) {
  // Each user has an inbox: users/{uid}/invites
  const inbox = collection(db, "users", invite.toUid, "invites");

  await addDoc(inbox, {
    ...invite,
    createdAt: serverTimestamp(),
    status: "sent",
  });
}
