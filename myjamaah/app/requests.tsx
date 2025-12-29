import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { getInvites, clearInvites, Invite } from "./store";

const placeLabel = (p: Invite["place"]) =>
  p === "work" ? "Workplace" : p === "mosque" ? "Nearest mosque" : "Outdoor spot";

export default function Requests() {
  const [items, setItems] = useState<Invite[]>([]);

  const refresh = () => setItems(getInvites());

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
          onPress={() => {
            clearInvites();
            refresh();
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

  row: { flexDirection: "row", gap: 10, marginBottom: 14 },
  btn: { backgroundColor: "#083b2f", padding: 12, borderRadius: 12 },
  danger: { backgroundColor: "#7f1d1d" },
  btnText: { color: "#fff", fontWeight: "900" },

  card: { backgroundColor: "#083b2f", padding: 14, borderRadius: 14, marginBottom: 10 },
  cardTitle: { color: "#fff", fontWeight: "900", fontSize: 16, marginBottom: 4 },
  cardMeta: { color: "#d1fae5" },

  empty: { color: "#d1fae5", marginTop: 20 },
});
