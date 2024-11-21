<script lang="ts">
  // - Todo: Only load 50 messages, if scroll up then keep fetching more
  // - Fix the send message button while loading state, it does break the layout
  // - If press the conversation and see no messages, show some texts like "No messages yet"
  // - Implement the Search Conversation, idea: create state called "dataToSearch" includes id and name of a conversation,
  // search in that data
  import { onMount, onDestroy } from "svelte";
  // import { checkAuthClient } from "$lib/components/checkAuthClient";
  import pb from "$lib/pocketbase/pocketbase";
  import { currentUser } from "$lib/stores/currentUser";
  import { get } from "svelte/store";
  import LoadingSpinner from "$lib/components/+LoadingSpinner.svelte";
  import { fade } from "svelte/transition";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { navigationState } from "$lib/stores/navigationState";

  type Message = {
    id: string;
    user_sent_id: string;
    user_sent_name: string;
    user_received_id: string;
    content: string;
    created: string;
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
    navigationState.set("Chats");
    if ($page.url.pathname !== "" && $page.url.pathname !== "rooms")
      fetchConversations().then(() => {
        if ($page.params.conversation_id !== "_") {
          if (!($page.params.conversation_id in conversations)) {
            goto("/to/_");
          } else {
            conversation_id = $page.params.conversation_id;
            fetchMessages(conversation_id);
          }
        }
      });
    // Todo list: scroll to the conversation with the id when onmount
  });

  onDestroy(() => {
    pb.collection("messages_users").unsubscribe();
  });

  $effect(() => {
    // Only sync when !== "_"
    if (conversation_id && conversation_id !== "_") {
      goto(`/to/${conversation_id}`);
    }
  });

  $effect(() => {
    if (conversations[conversation_id]?.messages) {
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
      const recordLastMessages = await pb
        .collection("last_message")
        .getFullList({
          expand: "message",
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
      recordLastMessages.forEach((record) => {
        if (conversations[record.conversation]) {
          conversations[record.conversation].isRead =
            record.last_user_sent === get(currentUser)?.id ? true : false;
          conversations[record.conversation].last_message =
            record.expand?.message.content;
        }
      });
      subscribeToMessages();
      loadConversationsError = "";
    } catch (Error: any) {
      loadConversationsError = Error.message;
    }
    loadingConversations = false;
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
            created: record.created,
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
          conversations[e.record.conversation].messages = [
            ...(conversations[e.record.conversation].messages || []),
            {
              id: e.record.id,
              user_sent_id: e.record.user_sent,
              user_sent_name: e.record.expand?.user_sent.name,
              user_received_id:
                conversations[e.record.conversation].target_user_id,
              content: e.record.content,
              created: e.record.created,
            },
          ];
          conversations[e.record.conversation].last_message = e.record.content;
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
                created: e.record.created,
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
          created: record.created,
        },
      ];
      conversations[conversation_id].isRead = true;
      conversations[conversation_id].last_message = record.content;
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
  }; // Test this stuff
</script>

<svelte:head>
  <title>Chat</title>
</svelte:head>

<main class="container">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_missing_attribute, a11y_no_noninteractive_element_interactions (because of reasons) -->
  <div class="sidebar">
    <div class="search-box">
      <input
        type="text"
        placeholder="Search conversations..."
        bind:value={searchText}
        disabled={loadingConversations}
        onchange={searchConversation}
      />
      <button onclick={toggleDialog}>New</button>
    </div>
    <div class="chat-list">
      {#if loadingConversations}
        <LoadingSpinner />
      {:else if conversations && !loadingConversations}
        {#each Object.values(conversations) as conversation}
          <div
            class={"chat-item " +
              (conversation.id === conversation_id ? "active" : "")}
            onclick={() => {
              fetchMessages(conversation.id);
              conversation_id = conversation.id;
            }}
          >
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
                {#if conversation.last_message}
                  {conversation.isRead === true
                    ? "You: " + conversation.last_message
                    : "" + conversation.last_message}
                {/if}
              </p>
            </div>
          </div>
        {/each}
      {/if}
      {#if loadConversationsError}
        <div class="error">{loadConversationsError}</div>
      {/if}
    </div>
  </div>
  <div class="chat-main">
    <div class="chat-header">
      <div class="chat-contact">
        <img
          src={conversation_id
            ? "https://pocketbase.ikniz.site/api/files/users/" +
              conversations[conversation_id]?.target_user_id +
              "/" +
              conversations[conversation_id]?.target_user_image
            : "https://api.dicebear.com/7.x/avataaars/svg?seed=2"}
          alt="Contact"
          class="avatar"
        />
        <h3>
          {#if conversation_id}
            {conversations[conversation_id].target_user_name}
          {:else}
            Choose a conversation or create a new one to start chatting
          {/if}
        </h3>
      </div>
    </div>
    <div class="messages" bind:this={messagesContainer}>
      {#if loadingMessages}
        <LoadingSpinner />
      {:else if conversations[conversation_id]?.messages}
        {#each conversations[conversation_id]?.messages as message}
          {#if message.user_sent_id === get(currentUser)?.id}
            <div class="message sent">
              <p>{message.content}</p>
              <span class="time">{message.created}</span>
            </div>
            <!-- {message.user_sent_name} -->
          {:else}
            <div class="message received">
              <p>{message.content}</p>
              <span class="time">{message.created}</span>
            </div>
          {/if}
        {/each}
      {/if}
      {#if loadMessagesError}
        <div class="error">{loadMessagesError}</div>
      {/if}
    </div>
    <form class="message-input">
      <input
        type="text"
        placeholder="Type a message..."
        disabled={!conversation_id || conversation_id === "_"}
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
          style="height: 48px; width: 100%; padding: 0px 12px; border: none; background-color: #f0f2f5; border-radius: 20px"
          required
          bind:value={createConversationText}
        />
        <div style="display: flex; gap: 12px">
          {#if loadingCreatingConversation}
            <LoadingSpinner />
          {:else}
            <button
              class="create-conversation-btn"
              onclick={createConversation}
              disabled={loadingCreatingConversation}>Add</button
            >
          {/if}
          <button
            onclick={toggleDialog}
            class="close-conversation-btn"
            disabled={loadingCreatingConversation}>Close</button
          >
        </div>
        {#if createConversationError}
          <div class="error">{createConversationError}</div>
        {/if}
      </form>
      {#if createConversationSuccess}
        <div class="success">Successfully!</div>
      {/if}
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

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .search-box {
    padding: 10px;
    display: flex;
    gap: 8px;
  }

  .search-box input {
    width: 100%;
    padding: 8px 15px;
    border: none;
    border-radius: 20px;
    background: #f0f2f5;
    font-size: 14px;
    height: 52px;
    flex: 1;
  }

  .search-box button {
    padding: 0px 16px;
    background-color: #0084ff;
    font-weight: 600;
    border-radius: 20px;
    color: white;
    border: none;
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
    width: 50vh;
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

  .create-conversation-btn {
    background-color: #0084ff;
    height: 40px;
    width: 80px;
    font-weight: 600;
    border-radius: 20px;
    color: white;
    border: none;
  }

  .create-conversation-btn:hover {
    background: #0073e6;
  }

  .close-conversation-btn {
    background-color: #f0f2f5;
    height: 40px;
    width: 80px;
    font-weight: 600;
    border-radius: 20px;
    color: gray;
    border: none;
  }
</style>
