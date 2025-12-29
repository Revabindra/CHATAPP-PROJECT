import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { axiosInstance } from "../lib/axios";
import { X } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // Helper to make sure uploads link to the backend origin when URL is relative
  const normalizeUrl = (url) => {
    if (!url) return url;
    try {
      // absolute URL => return as-is
      const u = new URL(url);
      return u.href;
    } catch (e) {
      // relative URL (starts with /uploads) -> prefix backend origin
      if (url.startsWith("/uploads")) {
        const backendOrigin = axiosInstance.defaults.baseURL.replace(/\/api\/?$/, "");
        return `${backendOrigin}${url}`;
      }
      return url;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="relative chat-bubble flex flex-col">
              {/* Delete button for sender */}
              {message.senderId === authUser._id && (
                <button
                  onClick={() => {
                    if (confirm("Delete this message?")) {
                      useChatStore.getState().deleteMessage(message._id);
                    }
                  }}
                  title="Delete message"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-base-300 flex items-center justify-center"
                >
                  <X className="size-3" />
                </button>
              )}

              {/* Attachment rendering */}
              {message.file && message.file.mimeType && message.file.mimeType.startsWith("image/") && (
                <img
                  src={normalizeUrl(message.file.url)}
                  alt={message.file.filename || "Attachment"}
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}

              {/* Legacy image support */}
              {!message.file && message.image && (
                <img
                  src={normalizeUrl(message.image)}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}

              {/* Non-image file */}
              {message.file && (!message.file.mimeType || !message.file.mimeType.startsWith("image/")) && (
                <a
                  href={normalizeUrl(message.file.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 bg-base-200 mb-2"
                >
                  <span className="font-medium">{message.file.filename || "Download"}</span>
                  <span className="text-xs opacity-60">{message.file.mimeType}</span>
                </a>
              )}

              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;