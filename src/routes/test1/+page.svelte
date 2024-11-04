<script lang="ts">
  import { onMount } from "svelte";
  import { checkAuthClient } from "$lib/components/checkAuthClient";

  onMount(() => {
    checkAuthClient();
  });
</script>

<main>
  <div>This is test1</div>
</main>
