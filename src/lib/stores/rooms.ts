import { writable } from "svelte/store";

type Room = {
  room_id: string;
  room_name: string;
  description: string;
  thumbnail: string;
};

export const hasFetchedRooms = writable<boolean>(false);
export const rooms = writable<Room[]>();
