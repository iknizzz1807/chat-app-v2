<script lang="ts">
  import { onMount } from "svelte";
  import { navigationState } from "$lib/stores/navigationState";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import pb from "$lib/pocketbase/pocketbase";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";

  let showNotification: boolean = $state(false);
  let loadingRequestPassword: boolean = $state(false);
  let requestPasswordError: boolean = $state(false);
  let requestPasswordSuccess: boolean = $state(false);
  let avatarUrl: string = $state("");

  onMount(() => {
    checkAuthClient();
    navigationState.set("Profile");
  });

  $effect(() => {
    // After the check auth, change the avatar because the check auth process takes a while
    const user = get(currentUser);
    if (user) {
      avatarUrl = `https://pocketbase.ikniz.site/api/files/users/${user.id}/${user.avatar}`;
    }
  });

  function extractDate(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Tháng bắt đầu từ 0
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function notify() {
    if (!showNotification) {
      showNotification = true;
      // Close after 2 seconds
      setTimeout(() => {
        showNotification = false;
      }, 2000);
    }
  }

  const resetPasswordRequest = async () => {
    loadingRequestPassword = true;
    requestPasswordError = false;
    requestPasswordSuccess = false;
    try {
      await pb
        .collection("users")
        .requestPasswordReset(get(currentUser)?.email);
      requestPasswordSuccess = true;
    } catch (error: any) {
      requestPasswordError = error;
      requestPasswordSuccess = false;
    }
    loadingRequestPassword = false;
  };
</script>

<svelte:head>
  <title>Profile</title>
</svelte:head>
<main class="container">
  <div class="profile-card">
    <div class="profile-header">
      <div class="profile-pic-container">
        <img src={avatarUrl} alt="Profile" class="profile-pic" />
        <div class="online-status" title="Online"></div>
      </div>
      <h1>{get(currentUser)?.name}</h1>
      <p class="title">Active now</p>
    </div>

    <div class="profile-info">
      <div class="info-item">
        <span class="label">Email:</span>
        <span class="value">{get(currentUser)?.email}</span>
      </div>
      <div class="info-item">
        <span class="label">Username:</span>
        <span class="value">{get(currentUser)?.username}</span>
      </div>
      <div class="info-item">
        <span class="label">Joined:</span>
        <span class="value">{extractDate(get(currentUser)?.created)}</span>
      </div>
    </div>

    <div class="action-buttons">
      <button class="btn btn-primary" onclick={notify}>
        <i class="fas fa-edit"></i> Edit Profile
      </button>
      <button class="btn btn-secondary" onclick={resetPasswordRequest}>
        <i class="fas fa-key"></i> Reset Password
      </button>
    </div>
    {#if loadingRequestPassword}
      <LoadingSpinner />
    {/if}
    {#if requestPasswordError}
      <p class="error">
        Cannot send the reset password email. Please contact Admin.
      </p>
    {/if}
    {#if requestPasswordSuccess}
      <p class="success">Successfully, please check your email.</p>
    {/if}
  </div>
</main>

{#if showNotification}
  <div class="notification show">Please contact Admin!</div>
{/if}

<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  .profile-card {
    background: white;
    border-radius: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
    padding: 30px;
  }

  .profile-header {
    text-align: center;
    margin-bottom: 30px;
    position: relative;
  }

  .profile-pic-container {
    position: relative;
    width: 120px;
    margin: 0 auto;
  }

  .profile-pic {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    margin-bottom: 15px;
    border: 4px solid #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .online-status {
    position: absolute;
    bottom: 15px;
    right: 0;
    width: 20px;
    height: 20px;
    background-color: #31a24c;
    border-radius: 50%;
    border: 3px solid white;
  }

  .profile-header h1 {
    color: #1a1a1a;
    font-size: 24px;
    margin-bottom: 5px;
  }

  .title {
    color: #65676b;
    font-size: 16px;
  }

  .profile-info {
    margin-bottom: 20px;
  }

  .info-item {
    display: flex;
    margin-bottom: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #f0f2f5;
  }

  .label {
    color: #65676b;
    width: 100px;
    font-weight: 500;
  }

  .value {
    color: #1a1a1a;
    flex: 1;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .btn {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-primary {
    background-color: #0084ff;
    color: white;
  }

  .btn-primary:hover {
    background-color: #0073e6;
  }

  .btn-secondary {
    background-color: #e4e6eb;
    color: #050505;
  }

  .btn-secondary:hover {
    background-color: #d8dadf;
  }

  .notification {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #fff;
    color: #333;
    padding: 10px 20px;
    border-radius: 5px;
    font-size: 1rem;
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  /* When shown */
  .show {
    opacity: 1;
  }
</style>
