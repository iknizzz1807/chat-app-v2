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
  } else if (user && url.pathname === "/to") throw redirect(307, "/to/_");
  return { user };
}) satisfies LayoutLoad;
