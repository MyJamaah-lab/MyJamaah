import AsyncStorage from "@react-native-async-storage/async-storage";

export type InvitePlace = "work" | "mosque" | "outdoor";

export type Invite = {
  id: string;
  toName: string;
  place: InvitePlace;
  mins: number;
  createdAt: number;
  status: "sent" | "accepted" | "declined";
};

const STORAGE_KEY = "myjamaah_invites_v1";

let invites: Invite[] = [];

// Load invites from storage into memory
export const loadInvites = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    invites = raw ? (JSON.parse(raw) as Invite[]) : [];
  } catch {
    invites = [];
  }
  return invites;
};

// Save current memory invites into storage
const persist = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
  } catch {
    // ignore for MVP
  }
};

export const addInvite = async (invite: Invite) => {
  invites = [invite, ...invites];
  await persist();
};

export const getInvites = () => invites;

export const clearInvites = async () => {
  invites = [];
  await persist();
};
export const updateInviteStatus = async (id: string, status: Invite["status"]) => {
  invites = invites.map((i) => (i.id === id ? { ...i, status } : i));
  await persist();
};
