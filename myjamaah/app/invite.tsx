import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addInvite, InvitePlace } from "./store";

export default function Invite() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();

  const [place, setPlace] = useState<"work" | "mosque" | "outdoor" | null>(null);
  const [mins, setMins] = useState<number | null>(null);

  const places = useMemo(
    () => [
      { key: "work" as const, label: "My workplace (quiet room)" },
      { key: "mosque" as const, label: "Nearest mosque" },
      { key: "outdoor" as const, label: "Outdoor spot (park / clean area)" },
    ],
    []
  );

  const times = useMemo(() => [5, 10, 15, 20], []);

  const canSend = place && mins;

  const sendInvite = () => {
    if (!canSend) return;

    const placeLabel =
  place === "work" ? "Workplace" : place === "mosque" ? "Nearest mosque" : "Outdoor spot";

addInvite({
  id: String(Date.now()),
  toName: name ?? "brother",
  place: place as InvitePlace,
  mins: mins as number,
  createdAt: Date.now(),
  status: "sent",
});

Alert.alert("Invite saved ✅", `Saved invite to ${name ?? "brother"} • ${placeLabel} • ${mins}m`);
router.back();

  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite {name ?? "brother"}</Text>
      <Text style={styles.subtitle}>Choose a place and time.</Text>

      <Text style={styles.section}>Place</Text>
      {places.map((p) => (
        <Pressable
          key={p.key}
          onPress={() => setPlace(p.key)}
          style={[styles.option, place === p.key && styles.optionActive]}
        >
          <Text style={[styles.optionText, place === p.key && styles.optionTextActive]}>{p.label}</Text>
        </Pressable>
      ))}

      <Text style={styles.section}>Time</Text>
      <View style={styles.row}>
        {times.map((t) => (
          <Pressable
            key={t}
            onPress={() => setMins(t)}
            style={[styles.pill, mins === t && styles.pillActive]}
          >
            <Text style={[styles.pillText, mins === t && styles.pillTextActive]}>{t}m</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={sendInvite}
        style={[styles.send, !canSend && styles.sendDisabled]}
        disabled={!canSend}
      >
        <Text style={styles.sendText}>Send invite</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#022c22", padding: 16, paddingTop: 24 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: "#d1fae5", marginBottom: 16 },

  section: { color: "#a7f3d0", fontWeight: "900", marginTop: 12, marginBottom: 8 },

  option: {
    backgroundColor: "#083b2f",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionActive: { borderColor: "#a7f3d0" },
  optionText: { color: "#d1fae5", fontWeight: "800" },
  optionTextActive: { color: "#fff" },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: {
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  pillActive: { backgroundColor: "#a7f3d0" },
  pillText: { color: "#a7f3d0", fontWeight: "900" },
  pillTextActive: { color: "#052e23" },

  send: { backgroundColor: "#16a34a", borderRadius: 14, padding: 14, marginTop: 18 },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: "#fff", textAlign: "center", fontWeight: "900" },

  cancel: { padding: 14, marginTop: 6 },
  cancelText: { color: "#d1fae5", textAlign: "center", fontWeight: "800" },
});
