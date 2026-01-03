import { db } from "./firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
} from "firebase/firestore";

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

export async function sendInviteToFirestore(
  invite: Omit<InviteDoc, "createdAt" | "status">
) {
  // Create ONE shared inviteId so sender + receiver reference the same invite
  const inviteId = doc(collection(db, "users", invite.toUid, "invites")).id;

  // 1) Receiver inbox: users/{toUid}/invites/{inviteId}
  await setDoc(doc(db, "users", invite.toUid, "invites", inviteId), {
    ...invite,
    createdAt: serverTimestamp(),
    status: "sent",
  });

  // 2) Sender "sent" box: users/{fromUid}/sentInvites/{inviteId}
  await setDoc(
    doc(db, "users", invite.fromUid, "sentInvites", inviteId),
    {
      toUid: invite.toUid,
      toName: invite.toName,
      place: invite.place,
      mins: invite.mins,
      status: "sent",
      updatedAt: serverTimestamp(),
      fromName: invite.fromName,
    },
    { merge: true }
  );

  return inviteId;
}
