import type { LayoutLoad } from "./$types";
import { currentUser } from "$lib/stores/currentUser";
import { get } from "svelte/store";
import { redirect } from "@sveltejs/kit";

export const load = (async ({ url }) => {
  const user = get(currentUser);
  if (!user) {
    return {
      status: 302,
      redirect: "/login",
    };
  } else if (url.pathname === "/dm") throw redirect(307, "/dm/_");
  return { user };
}) satisfies LayoutLoad;
