export type InvitePlace = "work" | "mosque" | "outdoor";

export type Invite = {
  id: string;
  toName: string;
  place: InvitePlace;
  mins: number;
  createdAt: number;
  status: "sent" | "accepted" | "declined";
};

let invites: Invite[] = [];

export const addInvite = (invite: Invite) => {
  invites = [invite, ...invites];
};

export const getInvites = () => invites;

export const clearInvites = () => {
  invites = [];
};
