<script lang="ts">
  // - Todo: Only load 50 messages, if scroll up then keep fetching more
  // - Fix the send message button while loading state, it does break the layout
  // - If press the conversation and see no messages, show some texts like "No messages yet"
  // - Implement the Search Conversation, idea: create state called "dataToSearch" includes id and name of a conversation,
  // search in that data
  import { onMount, onDestroy } from "svelte";
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
    target_user_image: string;
    hasFetchedMessages: boolean;
    messages: Message[];
    isRead: boolean;
    last_message: string;
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
        if (
          !($page.params.conversation_id in conversations) &&
          $page.params.conversation_id !== "_"
        ) {
          goto("/to/_");
        } else {
          fetchMessages(conversation_id);
        }
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
    if (checkAuthClient()) {
      conversation_id = $page.params.conversation_id;
    }
  });

  $effect(() => {
    if (checkAuthClient()) {
      if (conversation_id) goto(`/to/${conversation_id}`);
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
            target_user_image:
              record.expand?.first_user.id === get(currentUser)?.id
                ? record.expand?.second_user.avatar
                : record.expand?.first_user.avatar,
            hasFetchedMessages: false,
            messages: [],
            isRead: true,
            last_message: "",
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

    const recordLastMessages = await pb.collection("last_message").getFullList({
      expand: "message",
    });
    recordLastMessages.forEach((record) => {
      if (conversations[record.conversation]) {
        conversations[record.conversation].isRead =
          record.last_user_sent === get(currentUser)?.id ? true : false;
        conversations[record.conversation].last_message =
          record.expand?.message.content;
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
          // This means a new conversation is created together with a new message
          const newConversation: Conversation = {
            id: e.record.conversation,
            target_user_id: e.record.user_sent,
            target_user_name: e.record.expand?.user_sent.name,
            target_user_image: e.record.expand?.user_sent.avatar,
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
            last_message: e.record.content,
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
        const newConversation: Conversation = {
          id: record.id,
          target_user_id:
            record.expand?.first_user.id === get(currentUser)?.id
              ? record.expand?.second_user.id
              : record.expand?.first_user.id,
          target_user_name:
            record.expand?.first_user.id === get(currentUser)?.id
              ? record.expand?.second_user.name
              : record.expand?.first_user.name,
          target_user_image:
            record.expand?.first_user.id === get(currentUser)?.id
              ? record.expand?.second_user.avatar
              : record.expand?.first_user.avatar,
          hasFetchedMessages: true,
          messages: [],
          isRead: true,
          last_message: "",
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
  <!-- <div class="conversations-section">
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
  </div> -->

  <div class="sidebar">
    <div class="search-box">
      <input type="text" placeholder="Search messages..." />
    </div>
    <div class="chat-list">
      {#if loadingConversations}
        <LoadingSpinner />
      {/if}
      {#if loadConversationsError}
        <div class="error">{loadConversationsError}</div>
      {/if}
      {#if conversations}
        {#each Object.values(conversations) as conversation}
          <div class="chat-item active">
            <img
              src={"https://pocketbase.ikniz.site/api/files/users/" +
                conversation.target_user_id +
                "/" +
                conversation.target_user_image}
              alt="Contact"
              class="avatar"
            />
            <div class="chat-info">
              <h4>{conversation.target_user_name}</h4>
              <p>
                {conversation.isRead === true
                  ? "You: "
                  : ""}{conversation.last_message}
              </p>
            </div>
          </div>
        {/each}
      {/if}

      <!-- <div class="chat-item active">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=2"
          alt="Contact"
          class="avatar"
        />
        <div class="chat-info">
          <h4>Alice Smith</h4>
          <p>Hey, how are you?</p>
        </div>
      </div>
      <div class="chat-item">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=3"
          alt="Contact"
          class="avatar"
        />
        <div class="chat-info">
          <h4>Bob Johnson</h4>
          <p>See you tomorrow!</p>
        </div>
      </div> -->
    </div>
  </div>
  <div class="chat-main">
    <div class="chat-header">
      <div class="chat-contact">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=2"
          alt="Contact"
          class="avatar"
        />
        <h3>Alice Smith</h3>
      </div>
    </div>
    <div class="messages">
      <div class="message received">
        <p>Hey! How are you doing?</p>
        <span class="time">10:30 AM</span>
      </div>
      <div class="message sent">
        <p>I'm doing great! Just finished my work. How about you?</p>
        <span class="time">10:31 AM</span>
      </div>
      <div class="message received">
        <p>Same here! Want to grab coffee later?</p>
        <span class="time">10:32 AM</span>
      </div>
      <div class="message sent">
        <p>Sure, that sounds great! How about 3 PM?</p>
        <span class="time">10:33 AM</span>
      </div>

      <div class="message received">
        <p>hat sounds great! How ab</p>
        <span class="time">10:32 AM</span>
      </div>
    </div>
    <div class="message-input">
      <input type="text" placeholder="Type a message..." />
      <button>Send</button>
    </div>
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
    width: 90%;
    height: calc(100vh - 40px);
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    overflow: hidden;
    margin-left: 80px;
    overflow-x: auto;
  }

  .sidebar {
    width: 350px;
    background: white;
    border-right: 1px solid #e5e5e5;
    display: flex;
    flex-direction: column;
  }

  /* .user-profile {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #e5e5e5;
  } */

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .search-box {
    padding: 10px;
  }

  .search-box input {
    width: 100%;
    padding: 8px 15px;
    border: none;
    border-radius: 20px;
    background: #f0f2f5;
    font-size: 14px;
    height: 52px;
  }

  .chat-list {
    overflow-y: auto;
    flex: 1;
  }

  .chat-item {
    padding: 10px 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .chat-item:hover {
    background: #f0f2f5;
  }

  .chat-item.active {
    background: #e5efff;
  }

  .chat-info h4 {
    font-size: 15px;
    margin-bottom: 3px;
  }

  .chat-info p {
    font-size: 13px;
    color: #65676b;
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    padding: 15px 20px;
    border-bottom: 1px solid #e5e5e5;
  }

  .chat-contact {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .messages {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex: 0 0 350;
    padding: 20px;
    background: #fff;
    gap: 10px;
    flex: 1;
  }

  .message {
    max-width: 60%;
    padding: 10px 15px;
    border-radius: 18px;
    position: relative;
  }

  .message p {
    font-size: 14px;
    line-height: 1.4;
  }

  .message .time {
    font-size: 11px;
    color: #65676b;
    margin-top: 5px;
    display: block;
  }

  .received {
    align-self: flex-start;
    background: #e5e5e5;
    border-bottom-left-radius: 5px;
  }

  .sent {
    align-self: flex-end;
    background: #0084ff;
    color: white;
    border-bottom-right-radius: 5px;
  }

  .sent .time {
    color: rgba(255, 255, 255, 0.7);
  }

  .message-input {
    padding: 20px;
    border-top: 1px solid #e5e5e5;
    display: flex;
    gap: 10px;
  }

  .message-input input {
    flex: 1;
    padding: 10px 15px;
    border: none;
    border-radius: 20px;
    background: #f0f2f5;
    font-size: 14px;
    height: 52px;
  }

  .message-input button {
    padding: 10px 28px;
    border: none;
    border-radius: 20px;
    background: #0084ff;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .message-input button:hover {
    background: #0073e6;
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
</style>
