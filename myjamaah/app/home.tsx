import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";

type Brother = {
  id: string;
  name: string;
  distanceMins: number;
  status: "available" | "busy";
};

export default function Home() {
  const [available, setAvailable] = useState(false);

  const brothers: Brother[] = useMemo(
    () => [
      { id: "1", name: "Abdullah", distanceMins: 4, status: "available" },
      { id: "2", name: "Yusuf", distanceMins: 7, status: "available" },
      { id: "3", name: "Bilal", distanceMins: 10, status: "busy" },
      { id: "4", name: "Ibrahim", distanceMins: 12, status: "available" },
    ],
    []
  );

  const nearby = brothers
    .filter((b) => b.status === "available")
    .sort((a, b) => a.distanceMins - b.distanceMins);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyJamaah</Text>

      <Text style={styles.status}>
        Your status: {available ? "Available to pray" : "Not available"}
      </Text>

      <Pressable
        style={[styles.toggle, available && styles.toggleOn]}
        onPress={() => setAvailable((v) => !v)}
      >
        <Text style={styles.toggleText}>
          {available ? "Set as unavailable" : "I’m available to pray now"}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Nearby brothers</Text>

      <FlatList
        data={nearby}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.distanceMins} min away</Text>
            </View>
            <Text style={styles.invite}>Invite</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No brothers available right now.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 24, paddingHorizontal: 16, backgroundColor: "#022c22" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 8 },
  status: { color: "#d1fae5", marginBottom: 12 },
  toggle: { backgroundColor: "#16a34a", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 18 },
  toggleOn: { backgroundColor: "#065f46" },
  toggleText: { color: "#fff", fontWeight: "700", textAlign: "center" },

  sectionTitle: { color: "#a7f3d0", fontWeight: "800", marginBottom: 10, marginTop: 6 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#083b2f",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  name: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  meta: { color: "#d1fae5" },
  invite: { color: "#22c55e", fontWeight: "900" },

  empty: { color: "#d1fae5", marginTop: 10 },
});
