<script lang="ts">
  import { onMount } from "svelte";
  import { navigationState } from "$lib/stores/navigationState";
  import { checkAuthClient } from "$lib/components/checkAuthClient";

  onMount(() => {
    checkAuthClient();
    navigationState.set("Profile");
  });
</script>

<main>
  <div>Home</div>
</main>
