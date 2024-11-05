<script lang="ts">
  import { onMount } from "svelte";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";
  import { load } from "../+layout";

  type Room = {
    room_name: string;
    user_created: string;
  };

  let room_name: string = $state("");
  let error: string = $state("");
  let rooms: Room[] | null = $state(null);

  let loading: boolean = $state(false);

  onMount(async () => {
    if (checkAuthClient()) {
      fetchRooms();
    }
  });

  const fetchRooms = async () => {
    loading = true;
    try {
      const records = await pb.collection("rooms").getFullList({
        expand: "user_created",
      });
      rooms = records.map((record) => ({
        room_name: record.name,
        user_created: record.expand?.user_created.name,
      }));
      error = "";
    } catch (Error: any) {
      error = Error.message;
    }
    loading = false;
  };

  const createNewRoom = async () => {
    loading = true;
    try {
      const record = await pb
        .collection("rooms")
        .create(
          { name: room_name, user_created: get(currentUser)?.id },
          { expand: "user_created" }
        );
      rooms = [
        ...(rooms || []),
        {
          room_name: record.name,
          user_created: record.expand?.user_created.name,
        },
      ];
      room_name = "";
      error = "";
    } catch (Error: any) {
      error = Error.message;
    }
    loading = false;
  };
</script>

<main>
  <form>
    <input
      type="text"
      placeholder="Create a new room"
      bind:value={room_name}
      required
    />
    <button onclick={createNewRoom} type="submit" disabled={loading}
      >Create</button
    >
    {#if error}
      <div class="error">{error}</div>
    {/if}
  </form>
  <h1>Room list:</h1>
  <button onclick={fetchRooms} disabled={loading}>Refresh</button>
  {#if rooms}
    {#each rooms as room}
      <div><strong>Room name: {room.room_name}</strong></div>
      <div>Created by: {room.user_created}</div>
    {/each}
  {/if}
  {#if loading}
    <LoadingSpinner />
  {/if}
</main>

<style>
  .error {
    color: red;
    font-weight: bold;
  }
</style>
