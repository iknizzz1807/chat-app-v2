<script lang="ts">
  import { onMount } from "svelte";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import { goto } from "$app/navigation";

  onMount(() => checkAuthClient());
</script>

<main>
  <div>Home</div>
</main>
