import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { ensureSignedIn } from "../lib/auth";
import { db } from "../lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { sendInviteToFirestore } from "../lib/invitesApi";
import { auth } from "../lib/firebase";
import { fetchPrayerTimes, getCurrentPrayer, PrayerTimes } from "../lib/prayerTimes";

import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

type FireUser = {
  id: string;
  lat?: number;
  lng?: number;
  available?: boolean;
  gender?: string;
  lastSeenAt?: any;
  LastSeenAt?: any;
};

type NearbyRow = {
  id: string;
  name: string;
  km: number;
  minsWalk: number;
  lastSeenText: string;
  minsAgo: number;
};

export default function Home() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(3);
  const ACTIVE_WITHIN_MINS = 15;

  const [remoteUsers, setRemoteUsers] = useState<FireUser[]>([]);

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [loadingPrayer, setLoadingPrayer] = useState(false);

  // ---- Firestore helpers ----

  const upsertUser = async (userId: string) => {
    await setDoc(
      doc(db, "users", userId),
      {
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        gender: "male",
      },
      { merge: true }
    );
  };

  const subscribeNearbyFromFirestore = (currentUid: string | null) => {
    const q = query(
      collection(db, "users"),
      where("available", "==", true),
      where("gender", "==", "male"),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const users: FireUser[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((u) => u.id !== currentUid);

        setRemoteUsers(users);
      },
      (err) => {
        Alert.alert("Realtime error", String((err as any)?.message ?? err));
      }
    );
  };

  const writeAvailability = async (value: boolean) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid), {
        available: value,
        lastSeenAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert("Write FAILED ❌", String(e?.message ?? e));
    }
  };

  // ---- Prayer times loader ----
  const loadPrayerTimes = async (latitude: number, longitude: number) => {
    setLoadingPrayer(true);
    const times = await fetchPrayerTimes(latitude, longitude);
    setPrayerTimes(times);
    setLoadingPrayer(false);
  };

  // ---- Auth on mount ----
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    ensureSignedIn()
      .then(async (user) => {
        setUid(user.uid);
        await upsertUser(user.uid);
        unsubscribe = subscribeNearbyFromFirestore(user.uid);
      })
      .catch((e) => Alert.alert("Auth error", String((e as any)?.message ?? e)));

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Load prayer times on mount (using device location) ----
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({});
        await loadPrayerTimes(pos.coords.latitude, pos.coords.longitude);
      } catch (e) {
        console.error("Failed to load prayer times:", e);
      }
    })();
  }, []);

  // ---- Whenever availability changes, sync to Firestore ----
  useEffect(() => {
    if (!uid) return;
    writeAvailability(available);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, uid]);

  // ---- Location ----
  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location needed", "We need your location to find brothers nearby.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      const nextCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(nextCoords);

      // Refresh prayer times too when location updates
      loadPrayerTimes(nextCoords.latitude, nextCoords.longitude);

      if (uid) {
        const round = (n: number) => Math.round(n * 200) / 200;

        await updateDoc(doc(db, "users", uid), {
          lat: round(nextCoords.latitude),
          lng: round(nextCoords.longitude),
          available,
          lastSeenAt: serverTimestamp(),
        });
      }
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? e));
    }
  };

  // ---- Distance ----
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

  const nearby: NearbyRow[] = useMemo(() => {
    if (!coords) return [];

    return remoteUsers
      .filter((u) => typeof u.lat === "number" && typeof u.lng === "number")
      .map((u) => {
        const km = distanceKm(coords.latitude, coords.longitude, u.lat!, u.lng!);
        const minsWalk = Math.max(1, Math.round((km / 4.8) * 60));

        let lastSeenText = "Active status unknown";
        let minsAgo: number | null = null;

        const rawLastSeen = u.lastSeenAt ?? u.LastSeenAt;

        if (rawLastSeen) {
          const ms =
            typeof rawLastSeen?.toMillis === "function"
              ? rawLastSeen.toMillis()
              : typeof rawLastSeen === "number"
              ? rawLastSeen
              : Date.now();

          minsAgo = Math.floor((Date.now() - ms) / 60000);
          lastSeenText = minsAgo <= 2 ? "Active now" : `${minsAgo}m ago`;
        }

        return {
          id: u.id,
          name: `Brother ${u.id.slice(0, 4)}`,
          km,
          minsWalk,
          lastSeenText,
          minsAgo: minsAgo ?? 9999,
        };
      })
      .filter((u) => u.km <= radiusKm)
      .sort((a, b) => a.km - b.km);
  }, [coords, remoteUsers, radiusKm]);

  const currentPrayerInfo = prayerTimes ? getCurrentPrayer(prayerTimes) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyJamaah</Text>

      {/* Prayer Times Card */}
      {loadingPrayer ? (
        <View style={styles.prayerCard}>
          <Text style={styles.prayerLoading}>Loading prayer times...</Text>
        </View>
      ) : prayerTimes && currentPrayerInfo ? (
        <View style={styles.prayerCard}>
          <Text style={styles.nextPrayer}>
            Next: {currentPrayerInfo.next} at {currentPrayerInfo.nextTime}
          </Text>
          <View style={styles.prayerGrid}>
            {[
              { name: "Fajr", time: prayerTimes.fajr },
              { name: "Dhuhr", time: prayerTimes.dhuhr },
              { name: "Asr", time: prayerTimes.asr },
              { name: "Maghrib", time: prayerTimes.maghrib },
              { name: "Isha", time: prayerTimes.isha },
            ].map((prayer) => {
              const isCurrent = currentPrayerInfo.current === prayer.name;
              const isNext = currentPrayerInfo.next === prayer.name;

              return (
                <View
                  key={prayer.name}
                  style={[
                    styles.prayerItem,
                    isCurrent && styles.prayerItemCurrent,
                    isNext && styles.prayerItemNext,
                  ]}
                >
                  <Text style={styles.prayerName}>{prayer.name}</Text>
                  <Text style={styles.prayerTime}>{prayer.time}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text style={{ color: "#d1fae5", marginBottom: 6 }}>
        User ID: {uid ? uid.slice(0, 8) : "Signing in..."}
      </Text>

      <Text selectable style={{ color: "#d1fae5", marginBottom: 6 }}>
        Full UID: {uid ?? "none"}
      </Text>

      <Text style={{ color: "#fff", marginBottom: 10 }}>Local available: {String(available)}</Text>

      <Pressable style={styles.smallBtn} onPress={() => router.push("/inbox")}>
        <Text style={styles.smallBtnText}>Inbox</Text>
      </Pressable>
      <Pressable style={styles.smallBtn} onPress={() => router.push("/sent")}>
        <Text style={styles.smallBtnText}>Sent</Text>
      </Pressable>

      <Text style={styles.status}>
        Your status: {available ? "Available to pray" : "Not available"}
      </Text>

      <Pressable style={[styles.toggle, available && styles.toggleOn]} onPress={() => setAvailable((v) => !v)}>
        <Text style={styles.toggleText}>
          {available ? "Set as unavailable" : "I'm available to pray now"}
        </Text>
      </Pressable>

      <Pressable
        style={styles.locationBtn}
        onPress={async () => {
          if (!uid) return Alert.alert("No uid yet");
          try {
            await updateDoc(doc(db, "users", uid), {
              available,
              lastSeenAt: serverTimestamp(),
            });
            Alert.alert("Write OK ✅", `Wrote available=${String(available)}`);
          } catch (e: any) {
            Alert.alert("Write FAILED ❌", String(e?.message ?? e));
          }
        }}
      >
        <Text style={styles.locationBtnText}>Force write availability</Text>
      </Pressable>

      <Pressable style={styles.locationBtn} onPress={getLocation}>
        <Text style={styles.locationBtnText}>{coords ? "Update my location" : "Get my location"}</Text>
      </Pressable>

      <View style={styles.radiusRow}>
        {[1, 3, 5, 10, 50].map((r) => (
          <Pressable
            key={r}
            onPress={() => setRadiusKm(r)}
            style={[styles.radiusPill, radiusKm === r && styles.radiusPillActive]}
          >
            <Text style={[styles.radiusText, radiusKm === r && styles.radiusTextActive]}>{r}km</Text>
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

              <Text
                style={[
                  styles.lastSeen,
                  item.lastSeenText === "Active now" && styles.activeNow,
                ]}
              >
                {item.lastSeenText === "Active now"
                  ? "🟢 Active now"
                  : `⏱ ${item.lastSeenText || "Active status unknown"}`}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.push({ pathname: "/invite", params: { name: item.name, toUid: item.id } })
              }
            >
              <Text style={styles.invite}>Invite</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {coords
              ? `No available brothers within ${radiusKm}km.`
              : "Tap \"Get my location\" to see nearby brothers."}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 24, paddingHorizontal: 16, backgroundColor: "#022c22" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 8 },

  prayerCard: {
    backgroundColor: "#083b2f",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  prayerLoading: {
    color: "#a7f3d0",
    textAlign: "center",
  },
  nextPrayer: {
    color: "#34d399",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  prayerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prayerItem: {
    backgroundColor: "#065f46",
    borderRadius: 12,
    padding: 12,
    width: "30%",
    alignItems: "center",
  },
  prayerItemCurrent: {
    backgroundColor: "#16a34a",
  },
  prayerItemNext: {
    borderWidth: 2,
    borderColor: "#34d399",
  },
  prayerName: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  prayerTime: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  activeNow: {
    color: "#34d399",
  },

  status: { color: "#d1fae5", marginBottom: 12 },

  smallBtn: {
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#083b2f",
  },
  smallBtnText: { color: "#a7f3d0", fontWeight: "900" },

  toggle: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleOn: { backgroundColor: "#065f46" },
  toggleText: { color: "#fff", fontWeight: "700", textAlign: "center" },

  locationBtn: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
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
  radiusPillActive: { backgroundColor: "#a7f3d0" },
  radiusText: { color: "#a7f3d0", fontWeight: "800" },
  radiusTextActive: { color: "#052e23" },

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
  lastSeen: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 6,
  },
  invite: { color: "#22c55e", fontWeight: "900" },

  empty: { color: "#d1fae5", marginTop: 10 },
});