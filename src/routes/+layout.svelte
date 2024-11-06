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
  {#if isLogin}
  <div class="navbar">
    <button onclick={() => goto("/")}>Home</button>
    <button onclick={() => goto("/rooms")}>Rooms</button>
    <button onclick={() => goto("/dm")}>Direct Messages</button>
  </div>
  {/if}
  {@render children()}
  {#if isLogin}
  <div class="footer">
      <strong><div>id: {get(currentUser)?.id}</div></strong>
      <strong><div>Name: {get(currentUser)?.name}</div></strong>
      <button onclick={logOut}>Log out</button>
  </div>
  {/if}
</main>

<style>
  .container {
    display: flex;
    height: 100vh;
    justify-content: center;
    flex-direction: column;
    align-items: center;
  }

  .navbar {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: center;  
    position: absolute;
    top: 0;
    gap: 24px;
    padding-top: 12px;
  }

  .footer {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: center;  
    position: absolute;
    bottom: 0;
    gap: 4px;
    padding-bottom: 12px;
    }
</style>