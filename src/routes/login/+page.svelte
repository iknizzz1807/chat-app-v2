<script lang="ts">
  import { login } from "./login";
  import { signup } from "./signup";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";

  onMount(() => {
    if (get(currentUser)) goto("/");
  });

  let formType: string = $state("login");

  let fullName: string = $state("");
  let email: string = $state("");
  let username: string = $state("");
  let password: string = $state("");
  let passwordConfirm: string = $state("");
  let error: string = $state("");

  let authOk: boolean = $state(false);
  let loading: boolean = $state(false);

  let formElement: HTMLFormElement | undefined = $state();

  $effect(() => {
    if (formType) error = "";
  });

  const handleLogin = async () => {
    loading = true;
    const response = await login(username, password);
    if (response) {
      loading = false;
      if (response.status === "error") {
        error = response.message;
      } else {
        authOk = true;
        error = "";
      }
    }
  };

  const handleSignup = async () => {
    const formData = new FormData(formElement);
    loading = true;
    const response = await signup(formData);
    if (response) {
      loading = false;
      if (response.status === "error") {
        error = response.message;
      } else {
        authOk = true;
        error = "";
      }
    }
  };
</script>

<main class="container">
  {#if formType === "login"}
    <h1 style="text-align: center;">LOGIN</h1>
    <form onsubmit={handleLogin} class="login-form">
      <input
        type="text"
        bind:value={username}
        placeholder="Username"
        required
      />
      <input
        type="password"
        bind:value={password}
        placeholder="Password"
        required
      />
      {#if loading}
        <div class="loading-spinner">
          <LoadingSpinner />
        </div>
      {:else}
        <button type="submit" class="main-button" disabled={authOk}
          >Login</button
        >
        <button onclick={() => (formType = "signup")} disabled={authOk}
          >To Signup</button
        >
      {/if}
      {#if error}
        <div class="error">{error}</div>
      {/if}
      {#if authOk}
        <div class="ok-msg">Successfully!</div>
      {/if}
    </form>
  {:else}
    <h1 style="text-align: center;">SIGNUP</h1>
    <form
      onsubmit={handleSignup}
      class="login-form"
      enctype="multipart/form-data"
      bind:this={formElement}
    >
      <input
        type="text"
        bind:value={fullName}
        placeholder="Full Name"
        required
        name="name"
      />
      <input
        type="text"
        bind:value={email}
        placeholder="Email for password recovery"
        required
        name="email"
      />
      <input
        type="text"
        bind:value={username}
        placeholder="Username"
        required
        name="username"
      />
      <input
        type="password"
        bind:value={password}
        placeholder="Password"
        required
        name="password"
      />
      <input
        type="password"
        placeholder="Password confirmed"
        bind:value={passwordConfirm}
        required
        name="passwordConfirm"
      />
      <label for="avatar">Upload an avatar</label>
      <input type="file" name="avatar" />

      {#if loading}
        <div class="loading-spinner">
          <LoadingSpinner />
        </div>
      {:else}
        <button type="submit" class="main-button" disabled={authOk}
          >Signup</button
        >
        <button onclick={() => (formType = "login")} disabled={authOk}
          >To Login</button
        >
      {/if}
      {#if error}
        <div class="error">{error}</div>
      {/if}
      {#if authOk}
        <div class="ok-msg">Successfully!</div>
      {/if}
    </form>
  {/if}
</main>

<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 2.5rem;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    width: 400px;
    gap: 12px;
    box-shadow: 10px 5px 5px gray;
    border: none;
    padding: 24px 24px;
  }

  .error {
    color: red;
    font-weight: bold;
  }

  button {
    display: flex;
    width: 80px;
    justify-content: center;
    align-items: center;
    align-self: center;
    height: 40px;
    border-radius: 8px;
    cursor: pointer;
  }
  input {
    height: 40px;
    border-radius: 8px;
    padding: 4px 12px;
  }

  .main-button {
    background-color: #0084ff;
    color: white;
  }

  .loading-spinner {
    align-self: center;
  }

  .ok-msg {
    color: green;
    font-weight: bold;
  }
</style>
