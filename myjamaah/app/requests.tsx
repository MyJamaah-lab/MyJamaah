import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { getInvites, clearInvites, Invite, loadInvites, updateInviteStatus } from "./store";


const placeLabel = (p: Invite["place"]) =>
  p === "work" ? "Workplace" : p === "mosque" ? "Nearest mosque" : "Outdoor spot";

export default function Requests() {
  const [items, setItems] = useState<Invite[]>([]);

  const refresh = async () => {
  await loadInvites();
  setItems(getInvites());
};


useEffect(() => {
  refresh();
}, []);


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Requests</Text>
      <Text style={styles.sub}>Sent invites (temporary for now)</Text>

      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={refresh}>
          <Text style={styles.btnText}>Refresh</Text>
        </Pressable>

       <Pressable
  style={[styles.btn, styles.danger]}
  onPress={async () => {
    await clearInvites();
    await refresh();
  }}
>
  <Text style={styles.btnText}>Clear</Text>
</Pressable>

      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>To: {item.toName}</Text>
    <Text style={styles.cardMeta}>
      {placeLabel(item.place)} • in {item.mins}m • {item.status}
    </Text>

    <View style={styles.actions}>
      <Pressable
        style={[styles.actionBtn, styles.accept]}
        onPress={async () => {
          await updateInviteStatus(item.id, "accepted");
          await refresh();
        }}
      >
        <Text style={styles.actionText}>Accept</Text>
      </Pressable>

      <Pressable
        style={[styles.actionBtn, styles.decline]}
        onPress={async () => {
          await updateInviteStatus(item.id, "declined");
          await refresh();
        }}
      >
        <Text style={styles.actionText}>Decline</Text>
      </Pressable>

      <Pressable
        style={[styles.actionBtn, styles.reset]}
        onPress={async () => {
          await updateInviteStatus(item.id, "sent");
          await refresh();
        }}
      >
        <Text style={styles.actionText}>Reset</Text>
      </Pressable>
    </View>
  </View>
)}

        ListEmptyComponent={<Text style={styles.empty}>No invites yet. Send one from Home.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#022c22", padding: 16, paddingTop: 24 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 6 },
  sub: { color: "#d1fae5", marginBottom: 14 },
actions: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
actionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
actionText: { color: "#fff", fontWeight: "900" },
accept: { backgroundColor: "#16a34a" },
decline: { backgroundColor: "#7f1d1d" },
reset: { backgroundColor: "#0f766e" },

  row: { flexDirection: "row", gap: 10, marginBottom: 14 },
  btn: { backgroundColor: "#083b2f", padding: 12, borderRadius: 12 },
  danger: { backgroundColor: "#7f1d1d" },
  btnText: { color: "#fff", fontWeight: "900" },

  card: { backgroundColor: "#083b2f", padding: 14, borderRadius: 14, marginBottom: 10 },
  cardTitle: { color: "#fff", fontWeight: "900", fontSize: 16, marginBottom: 4 },
  cardMeta: { color: "#d1fae5" },

  empty: { color: "#d1fae5", marginTop: 20 },
});
