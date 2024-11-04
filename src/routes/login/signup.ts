import pb from "$lib/pocketbase/pocketbase";
import { login } from "./login";

export const signup = async (
  fullname: string,
  email: string,
  username: string,
  password: string
) => {
  const data = {
    username: username,
    email: email,
    emailVisibility: true,
    password: password,
    passwordConfirm: password,
    name: fullname,
  };

  try {
    const record = await pb.collection("users").create(data);
    await login(data.username, data.password);
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
