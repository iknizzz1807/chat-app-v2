<script lang="ts">
  import { page } from "$app/stores";
</script>

<h1 style="text-align: center;">{$page.status}: {$page.error?.message}</h1>
