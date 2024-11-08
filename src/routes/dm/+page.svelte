<script lang="ts">
  // - Todo: Only load 50 messages, if scroll up then keep fetching more
  // - Just load messages on first time click on conversation, see messenger web for more detailed
  // - Fix the send message button while loading state, it does break the layout
  // - If press the conversation and see no messages, show some texts like "No messages yet"
  // - Implement the Search Conversation, idea: create state called "dataToSearch" includes id and name of a conversation,
  // search in that data
  // - Implement new message display on each conversation, change the. May be this can be achived by changing
  // the way subscribing the messages to filter all the messages with all the conversation_id that the user has,
  // when on mount fetch conversation as well as after creating a new conversation without refreshing the page.
  // suggestion: use $effect to listen to the changes in the list of conversations
  import { onMount, onDestroy } from "svelte";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";
  import { fade } from "svelte/transition";

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

  // Text in the input states:
  let searchText: string = $state("");
  let messageText: string = $state("");
  let createConversationText: string = $state("");

  // Lists of data states:
  let conversations: Conversation[] | null = $state(null);
  let messages: Message[] | null = $state(null);

  // Loading states:
  let loadingMessages: boolean = $state(false);
  let loadingConversations: boolean = $state(false);
  let loadingCreatingMessage: boolean = $state(false);
  let loadingCreatingConversation: boolean = $state(false);

  // Error states:
  let loadMessagesError: string = $state("");
  let loadConversationsError: string = $state("");
  let createMessageError: string = $state("");
  let createConversationError: string = $state("");

  // Success states:
  let createConversationSuccess: boolean = $state(false);

  // Identity states:
  let conversation_id: string = $state("");

  // Physical states:
  let isOpenDialog: boolean = $state(false);
  // let alreadySubscribeMessages: boolean = $state(false);

  // Marks:
  var messagesContainer: HTMLElement;

  onMount(() => {
    if (checkAuthClient()) {
      fetchConversations();
    }
  });

  onDestroy(() => {
    pb.collection("messages_users").unsubscribe();
  });

  $effect(() => {
    if (messages) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  function toggleDialog() {
    isOpenDialog = !isOpenDialog;
  }

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
        pb.collection("messages_users").unsubscribe();
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
    pb.collection("messages_users").subscribe(
      "*",
      function (e: any) {
        // console.log(e.action);
        // console.log(e.record);
        // Because the e.action can only be "create" so I assume that
        // all the changes are all about creating messages
        messages = [
          ...(messages || []),
          {
            id: e.record.id,
            user_sent_id: e.record.user_sent,
            user_sent_name: e.record.expand?.user_sent.name,
            content: e.record.content,
          },
        ];
      },
      {
        /* other options like expand, custom headers, etc. */
        expand: "user_sent",
        filter: `conversation = "${conversation_id}" && user_sent != "${get(currentUser)?.id}"`,
      }
    );
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
      console.log("send here");
      messageText = "";
    } catch (error: any) {
      createMessageError = error.message;
    }
    loadingCreatingMessage = false;
  };

  const searchConversation = () => {
    // console.log(searchText);
  };

  const createConversation = async () => {
    if (createConversationText.trim() === "") return;
    loadingCreatingConversation = true;
    createConversationError = "";
    createConversationSuccess = false;
    try {
      if (get(currentUser)) {
        const record = await pb.collection("conversations").create(
          {
            first_user: get(currentUser)?.id,
            second_user: createConversationText,
          },
          {
            expand: "first_user,second_user",
          }
        );
        createConversationSuccess = true;
        createConversationText = "";
        conversations = [
          ...(conversations || []),
          {
            id: record.id,
            target_user:
              record.expand?.first_user.id === get(currentUser)?.id
                ? record.expand?.second_user.name
                : record.expand?.first_user.name,
          },
        ];
      }
    } catch (error: any) {
      createConversationError = error.message;
    }
    loadingCreatingConversation = false;
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
      <button class="create-conversation-button" onclick={toggleDialog}
        >+</button
      >
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
            disabled={loadingMessages || conversation_id === conversation.id}
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

<!-- Things that is not shown -->
{#if isOpenDialog}
  <div class="dialog-backdrop" transition:fade>
    <div class="dialog">
      <form class="create-conversation-form">
        <input
          type="text"
          placeholder="User id you want to chat with"
          style="height: 40px; width: 100%; padding: 0px 12px"
          required
          bind:value={createConversationText}
        />
        {#if loadingCreatingConversation}
          <LoadingSpinner />
        {:else}
          <button
            onclick={createConversation}
            style="background-color: aqua; height: 40px; width: 60px"
            disabled={loadingCreatingConversation}>Add</button
          >
        {/if}
        {#if createConversationError}
          <div class="error">{createConversationError}</div>
        {/if}
        {#if createConversationSuccess}
          <div class="success">Successfully!</div>
        {/if}
        <button onclick={toggleDialog} style="width: fit-content;">Close</button
        >
      </form>
    </div>
  </div>
{/if}

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

  .create-conversation-button {
    width: 60px;
  }

  .create-conversation-form {
    display: flex;
    flex-direction: column;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    gap: 32px;
  }

  .conversations {
    overflow-y: auto;
    width: 100%;
  }

  .conversation {
    width: 100%;
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

  .error {
    color: red;
    font-weight: bold;
  }

  .success {
    color: green;
    font-weight: bold;
  }

  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }

  .dialog {
    background-color: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  }
</style>
