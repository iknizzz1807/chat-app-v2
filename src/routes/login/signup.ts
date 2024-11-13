import pb from "$lib/pocketbase/pocketbase";
import { login } from "./login";

export const signup = async (data: any) => {
  try {
    const record = await pb.collection("users").create(data);
    await login(data.get("username"), data.get("password"));
    return {
      status: "ok",
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message,
    };
  }
};
