<script lang="ts">
  import { currentUser } from "$lib/stores/currentUser";
  import pb from "$lib/pocketbase/pocketbase";
  import { goto } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { URL } from "./login/redirectURL";

  let {children} = $props();

  let isLogin: boolean = $state(false);

  const unsubscribe = currentUser.subscribe((user) => {
    isLogin = !!user; 
  });

  onDestroy(() => unsubscribe());

  function logOut() {
    pb.authStore.clear();
    URL.set(get(page).url.pathname)
    goto("/login");
  }
</script>

<main class="container">
  {@render children()}
  <div class="footer">
    {#if isLogin}
      <div>id: {get(currentUser)?.id}</div>
      <div>username: {get(currentUser)?.username}</div>
      <button onclick={logOut}>Log out</button>
    {/if}
  </div>
</main>

<style>
  .container {
    display: flex;
    height: 100vh;
    justify-content: center;
    flex-direction: column;
    align-items: center;
  }
  .footer {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: center;  
    position: absolute;
    bottom: 0;
    gap: 4px;
  }
</style>