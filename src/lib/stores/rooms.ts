import { writable } from "svelte/store";

type Room = {
  id: string;
  room_name: string;
  room_image: string;
  room_description: string;
  hasFetchedMessages: boolean;
  messages: Message[];
};

type Message = {
  id: string;
  user_sent_id: string;
  user_sent_name: string;
  user_avatar: string;
  content: string;
  created: string;
};

export const hasFetchedRooms = writable<boolean>(false);
export const rooms = writable<Room[]>();
