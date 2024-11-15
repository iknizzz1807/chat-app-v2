<script lang="ts">
  import { onMount } from "svelte";
  import { navigationState } from "$lib/stores/navigationState";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";

  // Todo:
  // + Create, fetch messages in each room
  // + Build and customize the UI

  type Room = {
    room_id: string;
    room_name: string;
    thumbnail: string;
  };

  let room_name: string = $state("");
  let error: string = $state("");
  let rooms: Room[] | null = $state(null);

  let loading: boolean = $state(false);

  onMount(async () => {
    navigationState.set("Rooms");
    if (checkAuthClient()) {
      fetchRooms();
    }
  });

  const fetchRooms = async () => {
    loading = true;
    try {
      const records = await pb.collection("rooms").getFullList({});
      rooms = records.map((record) => ({
        room_id: record.id,
        room_name: record.name,
        thumbnail: record.thumbnail,
      }));
      error = "";
    } catch (Error: any) {
      error = Error.message;
    }
    loading = false;
  };
</script>

<main class="container">
  {#if loading}
    <LoadingSpinner />
  {:else if rooms}
    {#each rooms as room}
      <div class="room">
        <strong>{room.room_name}</strong>
        <img
          src={"https://pocketbase.ikniz.site/api/files/rooms/" +
            room?.room_id +
            "/" +
            room?.thumbnail}
          alt="Room"
        />
      </div>
    {/each}
  {/if}
</main>

<style>
  .container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .room img {
    object-fit: contain;
  }
</style>
