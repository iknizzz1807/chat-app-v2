import type { LayoutLoad } from "./$types";
import { currentUser } from "$lib/stores/currentUser";
import { get } from "svelte/store";

export const load = (async ({ url }) => {
  const user = get(currentUser);
  if (!user) {
    return {
      status: 302,
      redirect: "/login",
    };
  }
  return { user };
}) satisfies LayoutLoad;
