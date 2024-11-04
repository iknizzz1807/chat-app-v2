import { writable } from "svelte/store";
import type { AuthModel } from "pocketbase";
import pb from "$lib/pocketbase/pocketbase";

export const currentUser = writable<AuthModel>(pb.authStore.model);

pb.authStore.onChange((auth) => {
  currentUser.set(pb.authStore.model);
});
