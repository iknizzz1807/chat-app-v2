<script lang="ts">
  import { onMount } from "svelte";
  import { navigationState } from "$lib/stores/navigationState";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";
  import { hasFetchedRooms, rooms } from "$lib/stores/rooms";

  // Todo:
  // + Create, fetch messages in each room
  // The fundamentals remain the same as conversations - messages.
  // Simplify the problems, dont add last messgaes or stuff, just the name and desciption
  // Rooms here are stores because I need it to be only fetched once, and also because this feature is simple
  // + Build and customize the UI

  let error: string = $state("");

  let loading: boolean = $state(false);

  onMount(async () => {
    navigationState.set("Rooms");
    if (checkAuthClient()) {
      if (!get(hasFetchedRooms)) {
        fetchRooms();
      }
    }
  });

  const fetchRooms = async () => {
    loading = true;
    try {
      const records = await pb.collection("rooms").getFullList({});
      rooms.set(
        records.map((record) => ({
          room_id: record.id,
          room_name: record.name,
          description: record.description,
          thumbnail: record.thumbnail,
        }))
      );
      error = "";
      hasFetchedRooms.set(true);
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
    {#each get(rooms) as room}
      <div class="room">
        <strong>{room.room_name}</strong>
        <br />
        <strong>{room.description}</strong>
        <!-- <img
          src={"https://pocketbase.ikniz.site/api/files/rooms/" +
            room?.room_id +
            "/" +
            room?.thumbnail}
          alt="Room"
        /> -->
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

  /* .room img {
    object-fit: contain;
  } */
</style>
