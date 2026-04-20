export interface UserInfo {
  userId: string;
  email?: string;
  nickname?: string;
  avatarUrl?: string;
  lang?: string;
  region?: string;
  createdAt?: string;
}

export type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; user: UserInfo }
  | { type: "error"; message: string };
