import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { db } from "./firebase";
import { ensureSignedIn } from "./auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

type InviteRow = {
  id: string;
  fromUid?: string;
  fromName?: string;
  place?: string;
  mins?: number;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
  readAt?: any;
};

export default function Inbox() {
  const [uid, setUid] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);

  // 1) Sign in + subscribe to your inbox in Firestore
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const user = await ensureSignedIn();
        setUid(user.uid);

        const q = query(
          collection(db, "users", user.uid, "invites"),
          orderBy("createdAt", "desc")
        );

        unsub = onSnapshot(
          q,
          async (snap) => {
            // Update UI list
            setInvites(
              snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
              }))
            );

            // Mark unread invites as read (readAt)
            try {
              const batch = writeBatch(db);
              let changed = 0;

              snap.docs.forEach((d) => {
                const data: any = d.data();
                if (data.readAt == null) {
                  batch.update(doc(db, "users", user.uid, "invites", d.id), {
                    readAt: serverTimestamp(),
                  });
                  changed++;
                }
              });

              if (changed > 0) {
                await batch.commit();
              }
            } catch {
              // ignore (inbox still works)
            }
          },
          (err) => {
            Alert.alert("Inbox listener error", String((err as any)?.message ?? err));
          }
        );
      } catch (e: any) {
        Alert.alert("Auth error", String(e?.message ?? e));
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 2) Update an invite status in your inbox
  const setStatus = async (inviteId: string, next: "accepted" | "declined" | "sent") => {
    if (!uid) return Alert.alert("Not signed in", "Open Home first so you are signed in.");

    try {
      await updateDoc(doc(db, "users", uid, "invites", inviteId), {
        status: next,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert("Update failed", String(e?.message ?? e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inbox</Text>

      <Text style={{ color: "#d1fae5", marginBottom: 8 }}>
        Inbox for UID: {uid ?? "(loading...)"}
      </Text>

      <FlatList
        data={invites}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const status = (item.status ?? "sent").toLowerCase();

          return (
            <View style={styles.card}>
              <Text style={styles.to}>From: {item.fromName ?? "Someone"}</Text>

              <Text style={styles.meta}>
                {item.place ?? "Somewhere"} • {item.mins ?? "?"}m
              </Text>

              <Text style={styles.meta}>Status: {status}</Text>

              <View style={styles.row}>
                <Pressable
                  style={[styles.actionBtn, styles.accept]}
                  onPress={() => setStatus(item.id, "accepted")}
                >
                  <Text style={styles.actionText}>Accept</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, styles.decline]}
                  onPress={() => setStatus(item.id, "declined")}
                >
                  <Text style={styles.actionText}>Decline</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, styles.reset]}
                  onPress={() => setStatus(item.id, "sent")}
                >
                  <Text style={styles.actionText}>Reset</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No invites yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#022c22", padding: 16, paddingTop: 24 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 12 },

  card: { backgroundColor: "#083b2f", borderRadius: 14, padding: 14, marginBottom: 10 },

  to: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  meta: { color: "#d1fae5", fontWeight: "700" },
  empty: { color: "#d1fae5", marginTop: 10 },

  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  accept: { backgroundColor: "#16a34a" },
  decline: { backgroundColor: "#b91c1c" },
  reset: { backgroundColor: "#0ea5e9" },
  actionText: { color: "#fff", fontWeight: "900" },
});
