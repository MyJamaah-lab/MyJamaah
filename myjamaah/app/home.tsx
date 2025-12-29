import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

type Brother = {
  id: string;
  name: string;
  status: "available" | "busy";
  lat: number;
  lng: number;
};

type BrotherWithDistance = Brother & { km: number; minsWalk: number };

export default function Home() {
  const [available, setAvailable] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
const [radiusKm, setRadiusKm] = useState(3);
const router = useRouter();

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location needed", "We need your location to find brothers nearby.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      Alert.alert("Error", "Could not get your location.");
    }
  };

  // Simple haversine distance (km)
  const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  };

  // Mock brothers (replace later with real users from Firebase)
  const brothers: Brother[] = useMemo(
    () => [
      { id: "1", name: "Abdullah", status: "available", lat: 51.5079, lng: -0.0877 },
      { id: "2", name: "Yusuf", status: "available", lat: 51.5055, lng: -0.0754 },
      { id: "3", name: "Bilal", status: "busy", lat: 51.5097, lng: -0.0950 },
      { id: "4", name: "Ibrahim", status: "available", lat: 51.5033, lng: -0.1196 },
    ],
    []
  );

  const nearby: BrotherWithDistance[] = useMemo(() => {
    if (!coords) return [];

    return brothers
      .filter((b) => b.status === "available")
      .map((b) => {
        const km = distanceKm(coords.latitude, coords.longitude, b.lat, b.lng);
        const minsWalk = Math.max(1, Math.round((km / 4.8) * 60)); // ~4.8km/h walking
        return { ...b, km, minsWalk };
      })
     .filter((b) => b.km <= radiusKm)
      .sort((a, b) => a.km - b.km);
  }, [coords, brothers]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyJamaah</Text>
      <Pressable style={styles.smallBtn} onPress={() => router.push("/requests")}>
  <Text style={styles.smallBtnText}>View Requests</Text>
</Pressable>


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

      <Pressable style={styles.locationBtn} onPress={getLocation}>
        <Text style={styles.locationBtnText}>
          {coords ? "Update my location" : "Get my location"}
        </Text>
      </Pressable>
<View style={styles.radiusRow}>
  {[1, 3, 5, 10, 50].map((r) => (
    <Pressable
      key={r}
      onPress={() => setRadiusKm(r)}
      style={[styles.radiusPill, radiusKm === r && styles.radiusPillActive]}
    >
      <Text style={[styles.radiusText, radiusKm === r && styles.radiusTextActive]}>
        {r}km
      </Text>
    </Pressable>
  ))}
</View>

      {coords && (
        <Text style={styles.coords}>
          Lat {coords.latitude.toFixed(4)} • Lng {coords.longitude.toFixed(4)}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Nearby brothers (within {radiusKm}km)</Text>

      <FlatList
        data={nearby}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.km.toFixed(2)} km • ~{item.minsWalk} min walk
              </Text>
            </View>

            <Pressable onPress={() => router.push({ pathname: "/invite", params: { name: item.name } })}>
              <Text style={styles.invite}>Invite</Text>
            </Pressable>

          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {coords ? `No available brothers within ${radiusKm}km.` : "Tap “Get my location” to see nearby brothers."}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 24, paddingHorizontal: 16, backgroundColor: "#022c22" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 8 },
  status: { color: "#d1fae5", marginBottom: 12 },
smallBtn: {
  alignSelf: "flex-start",
  marginBottom: 10,
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 999,
  backgroundColor: "#083b2f",
},
smallBtnText: {
  color: "#a7f3d0",
  fontWeight: "900",
},

  toggle: { backgroundColor: "#16a34a", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 12 },
  toggleOn: { backgroundColor: "#065f46" },
  toggleText: { color: "#fff", fontWeight: "700", textAlign: "center" },

  locationBtn: { backgroundColor: "#0ea5e9", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  locationBtnText: { color: "#052e23", fontWeight: "900", textAlign: "center" },

  radiusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 10,
  },
  radiusPill: {
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  radiusPillActive: {
    backgroundColor: "#a7f3d0",
  },
  radiusText: {
    color: "#a7f3d0",
    fontWeight: "800",
  },
  radiusTextActive: {
    color: "#052e23",
  },

  coords: { color: "#a7f3d0", marginBottom: 10, textAlign: "center" },

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
