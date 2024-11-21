// import { goto } from "$app/navigation";
// import { page } from "$app/stores";
// import { URL } from "../../routes/login/redirectURL";
// import { currentUser } from "$lib/stores/currentUser";
// import { get } from "svelte/store";

// export const checkAuthClient = () => {
//   if (!get(currentUser)) {
//     URL.set(get(page).url.pathname);
//     goto("/login");
//     return false;
//   }
//   return true;
// };
// This is used to solve the problem check auth when goto
