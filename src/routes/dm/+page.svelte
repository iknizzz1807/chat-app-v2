<script lang="ts">
  import { onMount } from "svelte";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";

  type Conversation = {
    id: string;
    target_user: string;
  };

  let searchText: string = $state("");
  let conversations: Conversation[] | null = $state(null);

  let loading: boolean = $state(false);
  let error: string = $state("");

  onMount(() => {
    if (checkAuthClient()) {
      fetchConversations();
    }
  });

  const fetchConversations = async () => {
    loading = true;
    try {
      const records = await pb.collection("conversations").getFullList({
        sort: "-created",
        expand: "first_user,second_user",
      });
      conversations = records.map((record) => ({
        id: record.id,
        target_user:
          record.expand?.first_user.id === get(currentUser)?.id
            ? record.expand?.second_user.name
            : record.expand?.first_user.name,
      }));
    } catch (Error: any) {
      error = Error.message;
    }
    loading = false;
  };

  const searchConversation = () => {
    console.log(searchText);
  };
</script>

<main class="container">
  <div class="conversations-section">
    <div class="search-create">
      <input
        type="text"
        placeholder="Search conversation"
        bind:value={searchText}
        oninput={searchConversation}
        class="search-bar"
      />
      <button class="create-conversation">+</button>
      <div>{error}</div>
    </div>
    <div class="conversations">
      {#if loading}
        <LoadingSpinner />
      {/if}
      {#if conversations}
        {#each conversations as conversation}
          <p>Conversation Id: {conversation.id}</p>
          <p><strong>{conversation.target_user}</strong></p>
        {/each}
      {/if}
      <!-- <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p> -->
    </div>
  </div>

  <div class="messages-section">
    <div style="font-size: 40px;">Messages</div>
    <div class="messages">
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
      <p>d</p>
    </div>

    <form class="send-messages-section">
      <input type="text" placeholder="Text here" class="text-bar" />
      <button type="submit">Send</button>
    </form>
  </div>
</main>

<style>
  .container {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 80%;
    height: 90vh;
    background-color: aqua;
    gap: 48px;
  }

  .conversations-section {
    display: flex;
    flex-direction: column;
    width: 30%;
    margin: 16px 16px;
  }

  .conversations {
    overflow-y: auto;
  }

  .search-create {
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    width: 100%;
    gap: 4px;
  }

  .messages-section {
    display: flex;
    flex-direction: column;
    width: 70%;
    margin: 16px 16px;
  }
  .send-messages-section {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
    gap: 24px;
  }

  .messages {
    overflow-y: auto;
  }

  /* Định dạng scrollbar mỏng */
  .messages::-webkit-scrollbar {
    width: 6px; /* Độ rộng thanh cuộn dọc */
    height: 6px; /* Độ cao thanh cuộn ngang */
  }

  /* Định dạng track của scrollbar */
  .messages::-webkit-scrollbar-track {
    background: transparent;
  }

  /* Định dạng thanh cuộn */
  .messages::-webkit-scrollbar-thumb {
    background-color: rgba(
      0,
      0,
      0,
      0.5
    ); /* Màu sắc và độ trong suốt của thanh cuộn */
    border-radius: 3px; /* Bo góc */
  }

  /* Định dạng thanh cuộn khi hover */
  .messages::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.7); /* Màu khi hover */
  }

  .search-bar {
    height: 30px;
    width: 100%;
  }

  .text-bar {
    height: 40px;
    width: 100%;
  }

  .create-conversation {
    width: 60px;
  }
</style>
