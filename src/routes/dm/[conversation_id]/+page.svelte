<script lang="ts">
  // - Todo: Only load 50 messages, if scroll up then keep fetching more
  // - Fix the send message button while loading state, it does break the layout
  // - If press the conversation and see no messages, show some texts like "No messages yet"
  // - Implement the Search Conversation, idea: create state called "dataToSearch" includes id and name of a conversation,
  // search in that data
  import { onMount, onDestroy, tick } from "svelte";
  import { checkAuthClient } from "$lib/components/checkAuthClient";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";
  import { fade } from "svelte/transition";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  type Message = {
    id: string;
    user_sent_id: string;
    user_sent_name: string;
    user_received_id: string;
    content: string;
  };

  type Conversation = {
    id: string;
    target_user_id: string;
    target_user_name: string;
    hasFetchedMessages: boolean;
    messages: Message[];
    isRead: boolean;
  };

  // Text in the input states:
  let searchText: string = $state("");
  let messageText: string = $state("");
  let createConversationText: string = $state("");

  // Lists of data states:
  let conversations: { [id: string]: Conversation } = $state({});

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

  // Identity states sync with url route:
  let conversation_id: string = $state("");

  // Physical states:
  let isOpenDialog: boolean = $state(false);
  // let alreadySubscribeMessages: boolean = $state(false);

  // Marks:
  var messagesContainer: HTMLElement;

  onMount(() => {
    if (checkAuthClient()) {
      fetchConversations().then(() => {
        if (!($page.params.conversation_id in conversations)) goto("/dm/_");
        fetchMessages(conversation_id);
      });

      // Handle syncing the current conversation_id to the url pathname,
      // make sure that the conversation_id get from the pathname must be
      // one of the available conversation_id
      // Todo list: scroll to the conversation with the id when onmount
    }
  });

  onDestroy(() => {
    pb.collection("messages_users").unsubscribe();
  });

  $effect(() => {
    if (conversations[conversation_id]?.messages) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  $effect(() => {
    conversation_id = $page.params.conversation_id;
  });

  $effect(() => {
    if (conversation_id) goto(`/dm/${conversation_id}`);
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
      conversations = records.reduce(
        (acc: { [key: string]: Conversation }, record) => {
          acc[record.id] = {
            id: record.id,
            target_user_id:
              record.expand?.first_user.id === get(currentUser)?.id
                ? record.expand?.second_user.id
                : record.expand?.first_user.id,
            target_user_name:
              record.expand?.first_user.id === get(currentUser)?.id
                ? record.expand?.second_user.name
                : record.expand?.first_user.name,
            hasFetchedMessages: false,
            messages: [],
            isRead: true,
          };
          return acc;
        },
        {}
      );
      loadConversationsError = "";
    } catch (Error: any) {
      loadConversationsError = Error.message;
    }
    loadingConversations = false;

    const recordLastMessages = await pb
      .collection("last_message")
      .getFullList({});
    recordLastMessages.forEach((record) => {
      if (conversations[record.conversation]) {
        conversations[record.conversation].isRead =
          record.last_user_sent === get(currentUser)?.id ? true : false;
      }
    });
    subscribeToMessages();
  };

  const fetchMessages = async (conversation_id: string) => {
    if (!conversations[conversation_id].hasFetchedMessages) {
      conversations[conversation_id].hasFetchedMessages = true;
      loadingMessages = true;
      loadMessagesError = "";
      try {
        if (get(currentUser)) {
          const records = await pb.collection("messages_users").getFullList({
            filter: `conversation = "${conversation_id}"`,
            sort: "created",
            expand: "user_sent",
          });

          conversations[conversation_id].messages = records.map((record) => ({
            id: record.id,
            user_sent_id: record.expand?.user_sent.id,
            user_sent_name: record.expand?.user_sent.name,
            user_received_id: record.user_received,
            content: record.content,
          }));
        } else {
          throw new Error("User is not authenticated");
        }
      } catch (error: any) {
        loadMessagesError = error.message;
      }
      loadingMessages = false;
    }
  };

  const subscribeToMessages = () => {
    pb.collection("messages_users").subscribe(
      "*",
      function (e: any) {
        if (conversations[e.record.conversation]) {
          conversations[conversation_id].messages = [
            ...(conversations[conversation_id].messages || []),
            {
              id: e.record.id,
              user_sent_id: e.record.user_sent,
              user_sent_name: e.record.expand?.user_sent.name,
              user_received_id: conversations[conversation_id].target_user_id,
              content: e.record.content,
            },
          ];
          conversations[e.record.conversation].isRead = false;
        } else if (!conversations[e.record.conversation]) {
          const newConversation = {
            id: e.record.conversation,
            target_user_id: e.record.user_sent,
            target_user_name: e.record.expand?.user_sent.name,
            hasFetchedMessages: false,
            messages: [
              {
                id: e.record.id,
                user_sent_id: e.record.user_sent,
                user_sent_name: e.record.expand?.user_sent.name,
                user_received_id: e.record.user_received,
                content: e.record.content,
              },
            ],
            isRead: false,
          };
          conversations[e.record.conversation] = newConversation;
        }
      },
      {
        filter: `user_received = "${get(currentUser)?.id}"`,
        expand: "user_sent",
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
          user_received: conversations[conversation_id].target_user_id,
          content: messageText,
        },
        { expand: "conversation,user_sent" }
      );
      conversations[conversation_id].messages = [
        ...(conversations[conversation_id].messages || []),
        {
          id: record.id,
          user_sent_id: record.user_sent,
          user_sent_name: record.expand?.user_sent.name,
          user_received_id: conversations[conversation_id].target_user_id,
          content: record.content,
        },
      ];
      conversations[conversation_id].isRead = true;
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
        const newConversation = {
          id: record.id,
          target_user_id:
            record.expand?.first_user.id === get(currentUser)?.id
              ? record.expand?.second_user.id
              : record.expand?.first_user.id,
          target_user_name:
            record.expand?.first_user.id === get(currentUser)?.id
              ? record.expand?.second_user.name
              : record.expand?.first_user.name,
          hasFetchedMessages: true,
          messages: [],
          isRead: true,
        };
        conversations[newConversation.id] = newConversation;
        conversation_id = newConversation.id;
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
        {#each Object.values(conversations) as conversation}
          <button
            type="button"
            onclick={() => {
              fetchMessages(conversation.id);
              conversation_id = conversation.id;
            }}
            aria-label="Open conversation with {conversation.target_user_name}"
            disabled={loadingMessages || conversation_id === conversation.id}
            class="conversation"
          >
            <p>Conversation Id: {conversation.id}</p>
            <p><strong>With: {conversation.target_user_name}</strong></p>
            {#if !conversation.isRead}
              <p>New message!</p>
            {/if}
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
      {:else if conversations[conversation_id]?.messages}
        {#each conversations[conversation_id]?.messages as message}
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
        <button
          type="submit"
          disabled={!conversation_id || conversation_id === "_"}
          onclick={sendMessage}>Send</button
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

  .search-bar {
    height: 30px;
    width: 100%;
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

  .text-bar {
    height: 40px;
    width: 100%;
    position: relative;
    bottom: 0;
  }
</style>
