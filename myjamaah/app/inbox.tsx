import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { auth } from "./firebase";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { setDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

type InviteRow = {
  id: string;
  fromUid?: string;
  fromName?: string;
  place?: string;
  mins?: number;
  status?: string;
  createdAt?: any;
};


export default function Inbox() {
  const [invites, setInvites] = useState<InviteRow[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Not signed in", "Open Home first so you are signed in.");
      return;
    }

    const q = query(
      collection(db, "users", uid, "invites"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setInvites(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
      },
      (err) => Alert.alert("Inbox error", String((err as any)?.message ?? err))
    );

    return () => unsub();
  }, []);
const updateInvite = async (inviteId: string, status: "accepted" | "declined") => {
  const myUid = auth.currentUser?.uid;
  if (!myUid) return Alert.alert("Not signed in");

  // Find the invite object so we can read fromUid and details
  const invite = invites.find((i) => i.id === inviteId);
  const fromUid = invite?.fromUid;

  try {
    // 1) Update receiver inbox invite
    await updateDoc(doc(db, "users", myUid, "invites", inviteId), {
      status,
    });

    // 2) Mirror status to sender "sentInvites"
    if (fromUid) {
      await setDoc(
        doc(db, "users", fromUid, "sentInvites", inviteId),
        {
          toUid: myUid,
          status,
          updatedAt: serverTimestamp(),
          // optional context
          place: invite?.place ?? null,
          mins: invite?.mins ?? null,
          toName: "You", // we can replace later with real profile names
          fromName: invite?.fromName ?? null,
        },
        { merge: true }
      );
    }
  } catch (e: any) {
    Alert.alert("Update failed", String(e?.message ?? e));
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inbox</Text>

      <FlatList
        data={invites}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
  <Text style={styles.from}>{item.fromName ?? "Unknown"} invited you</Text>

  <Text style={styles.meta}>
    {item.place ?? "Somewhere"} • {item.mins ?? "?"}m • {item.status ?? "sent"}
  </Text>

  {item.status === "sent" && (
    <View style={styles.row}>
      <Pressable
        style={styles.accept}
        onPress={() => updateInvite(item.id, "accepted")}
      >
        <Text style={styles.actionText}>Accept</Text>
      </Pressable>

      <Pressable
        style={styles.decline}
        onPress={() => updateInvite(item.id, "declined")}
      >
        <Text style={styles.actionText}>Decline</Text>
      </Pressable>
    </View>
  )}
</View>

        )}
        ListEmptyComponent={<Text style={styles.empty}>No invites yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#022c22", padding: 16, paddingTop: 24 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 12 },
  card: { backgroundColor: "#083b2f", borderRadius: 14, padding: 14, marginBottom: 10 },
  from: { color: "#fff", fontWeight: "900", marginBottom: 4 },
  meta: { color: "#d1fae5", fontWeight: "700" },
  empty: { color: "#d1fae5", marginTop: 10 },
});
