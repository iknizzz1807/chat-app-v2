<script lang="ts">
  import InfoCard from "$lib/components/+InfoCard.svelte";
  import { onMount } from "svelte";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";

  let data: { username: string; name: string } | null = $state(null);
  let error: string | null = $state(null);

  onMount(async () => {
    try {
      const user = get(currentUser);
      if (user) {
        const record = await pb.collection("users").getOne(user.id);
        data = { username: record.username, name: record.name };
      } else {
        error = "User not logged in";
        checkAuthClient();
      }
    } catch (err: any) {
      error = err.message;
    }
  });
</script>

<main>
  {#if data}
    <InfoCard name={data.name} username={data.username} />
  {:else if error}
    <p>{error}</p>
  {:else}
    <LoadingSpinner />
  {/if}
</main>
