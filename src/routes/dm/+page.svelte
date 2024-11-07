<script lang="ts">
  // Todo: fix the subscribe stuff because it does not work
  import { onMount, onDestroy } from "svelte";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";
  import type { UnsubscribeFunc } from "pocketbase";

  type Conversation = {
    id: string;
    target_user: string;
  };

  type Message = {
    id: string;
    user_sent_id: string;
    user_sent_name: string;
    content: string;
  };

  let searchText: string = $state("");
  let messageText: string = $state("");

  let conversations: Conversation[] | null = $state(null);
  let messages: Message[] | null = $state(null);

  let loadingMessages: boolean = $state(false);
  let loadingConversations: boolean = $state(false);
  let loadingCreatingMessage: boolean = $state(false);
  let loadMessagesError: string = $state("");
  let loadConversationsError: string = $state("");
  let createMessageError: string = $state("");

  let conversation_id: string = $state("");
  var messagesContainer: HTMLElement;

  let unsubscribe: () => Promise<UnsubscribeFunc>;

  onMount(() => {
    if (checkAuthClient()) {
      fetchConversations();
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  $effect(() => {
    if (messages) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  const fetchConversations = async () => {
    loadingConversations = true;
    loadConversationsError = "";
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
      loadConversationsError = "";
    } catch (Error: any) {
      loadConversationsError = Error.message;
    }
    loadingConversations = false;
  };

  const fetchMessages = async (conversation_id: string) => {
    loadingMessages = true;
    loadMessagesError = "";
    try {
      if (get(currentUser)) {
        const records = await pb.collection("messages_users").getFullList({
          filter: `conversation = "${conversation_id}"`,
          sort: "created",
          expand: "user_sent",
        });
        messages = records.map((record) => ({
          id: record.id,
          user_sent_id: record.expand?.user_sent.id,
          user_sent_name: record.expand?.user_sent.name,
          content: record.content,
        }));
        subscribeToMessages(conversation_id);
      } else {
        throw new Error("User is not authenticated");
      }
    } catch (error: any) {
      loadMessagesError = error.message;
    }
    loadingMessages = false;
  };

  const subscribeToMessages = (conversation_id: string) => {
    if (unsubscribe) {
      unsubscribe();
    }
    unsubscribe = () =>
      pb.collection("messages_users").subscribe("*", (record: any) => {
        if (record.conversation === conversation_id) {
          messages = [
            ...(messages || []),
            {
              id: record.id,
              user_sent_id: record.expand?.user_sent.id,
              user_sent_name: record.expand?.user_sent.name,
              content: record.content,
            },
          ];
        }
      });
  };

  const sendMessage = async () => {
    if (messageText.trim() === "") return;
    loadingCreatingMessage = true;
    createMessageError = "";
    try {
      const record = await pb.collection("messages_users").create(
        {
          conversation: conversation_id,
          user_sent: get(currentUser)?.id,
          content: messageText,
        },
        { expand: "user_sent" }
      );
      messages = [
        ...(messages || []),
        {
          id: record.id,
          user_sent_id: record.user_sent,
          user_sent_name: record.expand?.user_sent.name,
          content: record.content,
        },
      ];
      messageText = "";
    } catch (error: any) {
      createMessageError = error.message;
    }
    loadingCreatingMessage = false;
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
    </div>
    <div class="conversations">
      {#if loadingConversations}
        <LoadingSpinner />
      {/if}
      {#if loadConversationsError}
        <div class="error">{loadConversationsError}</div>
      {/if}
      {#if conversations}
        {#each conversations as conversation}
          <button
            type="button"
            onclick={() => {
              fetchMessages(conversation.id);
              conversation_id = conversation.id;
            }}
            aria-label="Open conversation with {conversation.target_user}"
            disabled={loadingMessages}
            class="conversation"
          >
            <p>Conversation Id: {conversation.id}</p>
            <p><strong>With: {conversation.target_user}</strong></p>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <div class="messages-section">
    <div style="font-size: 40px;">Messages</div>
    <div class="messages" bind:this={messagesContainer}>
      {#if loadingMessages}
        <LoadingSpinner />
      {:else if messages}
        {#each messages as message}
          {#if message.user_sent_id === get(currentUser)?.id}
            <div class="my-message">
              <p><strong>{message.user_sent_name}</strong></p>
              <p>{message.content}</p>
            </div>
          {:else}
            <div class="your-message">
              <p><strong>{message.user_sent_name}</strong></p>
              <p>{message.content}</p>
            </div>
          {/if}
        {/each}
      {/if}
      {#if loadMessagesError}
        <div class="error">{loadMessagesError}</div>
      {/if}
    </div>

    <form class="send-messages-section">
      <input
        type="text"
        placeholder="Text here"
        class="text-bar"
        bind:value={messageText}
        required
      />
      {#if loadingCreatingMessage}
        <LoadingSpinner />
      {:else}
        <button type="submit" disabled={!conversation_id} onclick={sendMessage}
          >Send</button
        >
      {/if}
    </form>
    {#if createMessageError}
      <div class="error">{createMessageError}</div>
    {/if}
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
    width: 100%;
  }

  .conversation {
    width: 100%;
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
    justify-content: space-between;
  }
  .send-messages-section {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    gap: 16px;
  }

  .messages {
    overflow-y: auto;
    width: 100%;
  }

  .my-message {
    text-align: right;
  }

  .your-message {
    text-align: left;
  }

  .search-bar {
    height: 30px;
    width: 100%;
  }

  .text-bar {
    height: 40px;
    width: 100%;
    position: relative;
    bottom: 0;
  }

  .create-conversation {
    width: 60px;
  }

  .error {
    color: red;
    font-weight: bold;
  }
</style>
