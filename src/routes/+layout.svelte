<script lang="ts">
  import { currentUser } from "$lib/stores/currentUser";
  import pb from "$lib/pocketbase/pocketbase";
  import { goto } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { URL } from "./login/redirectURL";

  let { children } = $props();

  let isLogin: boolean = $state(false);

  let dropdownVisible: boolean = $state(false);

  const unsubscribe = currentUser.subscribe((user) => {
    isLogin = !!user;
  }); // Subscribe to the current user to change the state of logout and navbar

  onDestroy(() => {
    unsubscribe();
  });

  function logOut() {
    pb.authStore.clear();
    URL.set(get(page).url.pathname);
    goto("/login");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Copied to clipboard: " + text);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
  />
</svelte:head>

<!-- <main class="container">
  {#if isLogin && $page.url.pathname !== "/login"}
    <div class="navbar">
      <button onclick={() => goto("/")}>Home</button>
      <button onclick={() => goto("/rooms")}>Rooms</button>
      <button onclick={() => goto("/to/_")}>Direct Messages</button>
    </div>
  {/if}
  {@render children()}
  {#if isLogin && $page.url.pathname !== "/login"}
    <div class="footer">
      <strong><div>id: {get(currentUser)?.id}</div></strong>
      <strong><div>Name: {get(currentUser)?.name}</div></strong>
      <button onclick={logOut}>Log out</button>
    </div>
  {/if}
</main> -->

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_missing_attribute, a11y_no_noninteractive_element_interactions (because of reasons) -->
<main class="container">
  {#if isLogin && $page.url.pathname !== "/login"}
    <nav class="nav-sidebar">
      <ul class="nav-items">
        <li class="active" onclick={() => goto("/to/_")}>
          <i class="fas fa-comment-dots"></i><span>Chats</span>
        </li>
        <li onclick={() => goto("/rooms")}>
          <i class="fas fa-users"></i><span>Rooms</span>
        </li>
        <!-- <li><i class="fas fa-bell"></i><span>Notifications</span></li>
        <li><i class="fas fa-cog"></i><span>Settings</span></li> -->
      </ul>
      <div
        class="nav-profile"
        onmouseenter={() => (dropdownVisible = !dropdownVisible)}
        onmouseleave={() => (dropdownVisible = !dropdownVisible)}
      >
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=1"
          alt="Profile"
          class="nav-avatar"
        />
        <span>{get(currentUser)?.name}</span>
        {#if dropdownVisible}
          <div class="dropdown-menu">
            <a
              style="display: flex; justify-content: center; align-items:center"
              onclick={() => copyToClipboard(get(currentUser)?.id)}
              >ID: {get(currentUser)?.id}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                fill="#000000"
                height="20px"
                width="20px"
                version="1.1"
                id="Layer_1"
                viewBox="0 0 64 64"
                enable-background="new 0 0 64 64"
                xml:space="preserve"
              >
                <g id="Text-files">
                  <path
                    d="M53.9791489,9.1429005H50.010849c-0.0826988,0-0.1562004,0.0283995-0.2331009,0.0469999V5.0228   C49.7777481,2.253,47.4731483,0,44.6398468,0h-34.422596C7.3839517,0,5.0793519,2.253,5.0793519,5.0228v46.8432999   c0,2.7697983,2.3045998,5.0228004,5.1378999,5.0228004h6.0367002v2.2678986C16.253952,61.8274002,18.4702511,64,21.1954517,64   h32.783699c2.7252007,0,4.9414978-2.1725998,4.9414978-4.8432007V13.9861002   C58.9206467,11.3155003,56.7043495,9.1429005,53.9791489,9.1429005z M7.1110516,51.8661003V5.0228   c0-1.6487999,1.3938999-2.9909999,3.1062002-2.9909999h34.422596c1.7123032,0,3.1062012,1.3422,3.1062012,2.9909999v46.8432999   c0,1.6487999-1.393898,2.9911003-3.1062012,2.9911003h-34.422596C8.5049515,54.8572006,7.1110516,53.5149002,7.1110516,51.8661003z    M56.8888474,59.1567993c0,1.550602-1.3055,2.8115005-2.9096985,2.8115005h-32.783699   c-1.6042004,0-2.9097996-1.2608986-2.9097996-2.8115005v-2.2678986h26.3541946   c2.8333015,0,5.1379013-2.2530022,5.1379013-5.0228004V11.1275997c0.0769005,0.0186005,0.1504021,0.0469999,0.2331009,0.0469999   h3.9682999c1.6041985,0,2.9096985,1.2609005,2.9096985,2.8115005V59.1567993z"
                  />
                  <path
                    d="M38.6031494,13.2063999H16.253952c-0.5615005,0-1.0159006,0.4542999-1.0159006,1.0158005   c0,0.5615997,0.4544001,1.0158997,1.0159006,1.0158997h22.3491974c0.5615005,0,1.0158997-0.4542999,1.0158997-1.0158997   C39.6190491,13.6606998,39.16465,13.2063999,38.6031494,13.2063999z"
                  />
                  <path
                    d="M38.6031494,21.3334007H16.253952c-0.5615005,0-1.0159006,0.4542999-1.0159006,1.0157986   c0,0.5615005,0.4544001,1.0159016,1.0159006,1.0159016h22.3491974c0.5615005,0,1.0158997-0.454401,1.0158997-1.0159016   C39.6190491,21.7877007,39.16465,21.3334007,38.6031494,21.3334007z"
                  />
                  <path
                    d="M38.6031494,29.4603004H16.253952c-0.5615005,0-1.0159006,0.4543991-1.0159006,1.0158997   s0.4544001,1.0158997,1.0159006,1.0158997h22.3491974c0.5615005,0,1.0158997-0.4543991,1.0158997-1.0158997   S39.16465,29.4603004,38.6031494,29.4603004z"
                  />
                  <path
                    d="M28.4444485,37.5872993H16.253952c-0.5615005,0-1.0159006,0.4543991-1.0159006,1.0158997   s0.4544001,1.0158997,1.0159006,1.0158997h12.1904964c0.5615025,0,1.0158005-0.4543991,1.0158005-1.0158997   S29.0059509,37.5872993,28.4444485,37.5872993z"
                  />
                </g>
              </svg></a
            >
            <a onclick={() => goto("/")}>Settings</a>
            <a onclick={logOut}>Logout</a>
          </div>
        {/if}
      </div>
    </nav>
  {/if}
  {@render children()}
</main>

<style>
  .container {
    width: 100%;
    align-items: center;
    justify-content: center;
  }

  .nav-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    background: white;
    width: 70px;
    transition: width 0.3s ease;
    overflow: hidden;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .nav-sidebar:hover {
    width: 200px;
  }

  .nav-items {
    list-style: none;
    padding-top: 20px;
  }

  .nav-sidebar ul li {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
  }

  .nav-sidebar ul li:hover {
    background: #f0f2f5;
  }

  .nav-sidebar ul li.active {
    background: #e5efff;
    color: #0084ff;
  }

  .nav-sidebar ul li i {
    font-size: 20px;
    width: 25px;
    text-align: center;
    flex-shrink: 0;
  }

  .nav-sidebar ul li span {
    font-size: 15px;
    visibility: hidden;
    margin-left: 20px;
    transition: visibility 0s linear 0.2s;
  }

  .nav-sidebar:hover ul li span {
    visibility: visible;
    transition-delay: 0s;
  }
  .nav-profile {
    padding: 15px 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    border-top: 1px solid #e5e5e5;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-radius: 5px;
    overflow: hidden;
    z-index: 1000;
    width: 100%;
  }

  .dropdown-menu a {
    display: block;
    padding: 10px 20px;
    color: #333;
    text-decoration: none;
    transition: background 0.2s;
  }

  .dropdown-menu a:hover {
    background: #f0f2f5;
  }

  .nav-profile:hover {
    background: #f0f2f5;
  }

  .nav-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
  }

  .nav-profile span {
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .nav-sidebar:hover .nav-profile span {
    opacity: 1;
  }
</style>
