import pb from "$lib/pocketbase/pocketbase";
import { goto } from "$app/navigation";
import { URL } from "./redirectURL";
import { get } from "svelte/store";

type LoginResponse = { status: "ok" } | { status: "error"; message: string };

export const login = async (username: string, password: string) => {
  try {
    const authData = await pb
      .collection("users")
      .authWithPassword(username, password);

    // Return status ok immediately
    const result: LoginResponse = {
      status: "ok",
    };

    // Perform delay and navigation asynchronously
    // setTimeout(() => {
    //   goto(get(URL));
    //   URL.set("/");
    // }, 500);

    return result;
  } catch (error: any) {
    const result: LoginResponse = {
      status: "error",
      message: error.message,
    };
    return result;
  }
};
