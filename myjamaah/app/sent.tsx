import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { auth } from "../lib/firebase";
import { db } from "../lib/firebase";
import { ensureSignedIn } from "../lib/auth";

type SentRow = {
  id: string;
  toName?: string;
  place?: string;
  mins?: number;
  status?: string;
  updatedAt?: any;
};

export default function Sent() {
  const [sent, setSent] = useState<SentRow[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
  let unsub: (() => void) | undefined;

  (async () => {
    try {
      const user = await ensureSignedIn();
      setUid(user.uid);

      const q = query(
        collection(db, "users", user.uid, "invites"),
        orderBy("createdAt", "desc")
      );

      unsub = onSnapshot(q, (snap) => {
        setInvites(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      });
    } catch (e: any) {
      Alert.alert("Auth error", String(e?.message ?? e));
    }
  })();

  return () => {
    if (unsub) unsub();
  };
}, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sent Invites</Text>
      
      <FlatList
  data={sent}
  keyExtractor={(i) => i.id}
  contentContainerStyle={{ paddingBottom: 24 }}
  renderItem={({ item }) => {
    const s = String(item.status ?? "sent").toLowerCase();

    return (
      <View style={styles.card}>
        <Text style={styles.to}>{item.toName ?? "Someone"}</Text>

        <Text style={styles.meta}>
          {item.place ?? "Somewhere"} • {item.mins ?? "?"}m
        </Text>

        <Text
          style={[
            styles.status,
            s === "accepted" && styles.statusAccepted,
            s === "declined" && styles.statusDeclined,
          ]}
        >
          {s === "accepted" ? "✅ Accepted" : s === "declined" ? "❌ Declined" : "⏳ Sent"}
        </Text>

        <Text style={styles.meta}>raw status: {String(item.status ?? "undefined")}</Text>
      </View>
    );
  }}
  ListEmptyComponent={<Text style={styles.empty}>No sent invites yet.</Text>}
/>
    </View>
  );
}

const styles = StyleSheet.create({
    statusAccepted: { color: "#34d399" },
    statusDeclined: { color: "#f87171" },
  container: { flex: 1, backgroundColor: "#022c22", padding: 16, paddingTop: 24 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 12 },
  card: { backgroundColor: "#083b2f", borderRadius: 14, padding: 14, marginBottom: 10 },
  to: { color: "#fff", fontWeight: "900", marginBottom: 4 },
  meta: { color: "#d1fae5", fontWeight: "700" },
  status: { color: "#a7f3d0", fontWeight: "900", marginTop: 6 },
  empty: { color: "#d1fae5", marginTop: 10 },
});

