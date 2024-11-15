import { writable } from "svelte/store";

export const navigationState = writable<"Profile" | "Chats" | "Rooms">(
  "Profile"
);
