import React, {
  FC,
  useState,
  useMemo,
  FormEvent,
  useRef,
  useEffect,
} from "react";
import { useDispatch, useStore, useSelector } from "react-redux";
import ReactMarkdown from "react-markdown";
import Draggable from "react-draggable";
import { Resizable } from "re-resizable";
import { createUITools } from "./tools";
import { AgentRunner, ChatMessage } from "./AgentRunner";
import { MessageType } from "./agent";
import { AppDispatch, RootState } from "../../reducers";
import { revertToAction } from "../../actions";

export const AgentComponent: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getState } = useStore();
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [firstActionCount, setFirstActionCount] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 400, height: 300 });

  const agentRunner = useMemo(() => {
    const tools = createUITools(dispatch, getState);
    return new AgentRunner(tools);
  }, [dispatch, getState]);

  const actionCount = useSelector((state: RootState) => state.actionCount);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);

    const userMessage = {
      role: "user" as const,
      content: input,
      timestamp: Date.now(),
      type: MessageType.Message,
      messageId: Date.now(),
      actionCount,
    };
    if (agentRunner.chatHistory.length === 0) {
      setFirstActionCount(actionCount);
    }

    agentRunner.chatHistory.push(userMessage);
    setChatHistory(agentRunner.chatHistory);
    setTimeout(scrollToBottom, 100);

    const currentInput = input;
    setInput("");

    try {
      await agentRunner.processQuery(currentInput);
      const lastMessage =
        agentRunner.chatHistory[agentRunner.chatHistory.length - 1];
      if (lastMessage.role === "assistant") {
        lastMessage.actionCount = actionCount;
      }
      setChatHistory(agentRunner.chatHistory);
      setTimeout(scrollToBottom, 0);
    } catch (error) {
      console.error("Agent Runner Error:", error);
      const errorMessage = {
        role: "assistant" as const,
        content: "Sorry, something went wrong. Please try again.",
        timestamp: Date.now(),
        type: MessageType.Message,
        messageId: Date.now(),
        actionCount,
      };
      agentRunner.chatHistory.push(errorMessage);
      setChatHistory(agentRunner.chatHistory);
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleReset = () => {
    dispatch(revertToAction(firstActionCount));
    setChatHistory([]);
    agentRunner.clearHistory();
    setInput("");
  };

  const handleEditStart = (message: ChatMessage) => {
    setEditingMessageId(message.messageId);
    setEditText(message.content);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditSubmit = async (message: ChatMessage) => {
    dispatch(revertToAction(message.actionCount));
    agentRunner.replaceMessage(message.messageId, editText, actionCount);
    setChatHistory(agentRunner.chatHistory);

    setEditingMessageId(null);
    setEditText("");
    setIsLoading(true);

    try {
      await agentRunner.processQuery(editText, 20, true);
      setChatHistory(agentRunner.chatHistory);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Agent Runner Error:", error);
      const errorMessage = {
        role: "assistant" as const,
        content: "Sorry, something went wrong. Please try again.",
        timestamp: Date.now(),
        type: MessageType.Message,
        messageId: Date.now(),
        actionCount,
      };
      agentRunner.chatHistory.push(errorMessage);
      setChatHistory(agentRunner.chatHistory);
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Draggable
      handle=".drag-handle"
      position={position}
      onStop={(_, data) => setPosition({ x: data.x, y: data.y })}
    >
      <Resizable
        size={size}
        onResizeStop={(_e, _dir, _ref, d) => {
          setSize({
            width: size.width + d.width,
            height: size.height + d.height,
          });
        }}
        minWidth={isDrawerOpen ? 200 : 20}
        minHeight={isDrawerOpen ? 200 : 0}
        maxWidth={isDrawerOpen ? "95vw" : 200}
        maxHeight={isDrawerOpen ? "95vh" : 60}
      >
        <div
          ref={cardRef}
          className="agent-component"
          style={{
            position: "fixed",
            width: "100%",
            height: isDrawerOpen ? "100%" : "auto",
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            border: "1px solid #eaeaea",
            backgroundColor: "white",
          }}
          tabIndex={-1}
        >
          <div
            className="drag-handle"
            style={{
              padding: "8px 16px",
              backgroundColor: "#f5f5f5",
              cursor: "move",
              borderBottom: isDrawerOpen ? "1px solid #eaeaea" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              <b>CELL x AI</b>
            </span>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {isDrawerOpen ? "▼" : "▲"}
            </button>
          </div>
          <div
            className="chat-drawer"
            style={{
              opacity: isDrawerOpen ? 1 : 0,
              backgroundColor: "white",
              visibility: isDrawerOpen ? "visible" : "hidden",
              boxShadow: "0 -8px 24px -4px rgba(0,0,0,0.15)",
              zIndex: 2,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transition: "opacity 0.2s ease-in-out",
              height: isDrawerOpen ? "auto" : 0,
            }}
          >
            <div
              ref={chatHistoryRef}
              className="chat-history"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 20px 0",
              }}
            >
              {chatHistory.map((message) => (
                <div
                  key={message.timestamp}
                  style={{
                    display: "flex",
                    justifyContent:
                      message.role === "user" ? "flex-end" : "flex-start",
                    margin: "12px 0",
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {message.role === "user" && (
                    <button
                      type="button"
                      onClick={() => handleEditStart(message)}
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        border: "1px solid #ddd",
                        backgroundColor: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        zIndex: 1,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                  <div
                    style={{
                      padding: "12px",
                      paddingBottom: "0",
                      borderRadius: "12px",
                      backgroundColor:
                        message.role === "user"
                          ? "#007bff"
                          : message.type === "summary"
                          ? "#e3f2fd"
                          : "#f5f5f5",
                      color: message.role === "user" ? "white" : "black",
                      maxWidth: "70%",
                    }}
                  >
                    {editingMessageId === message.messageId ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleEditSubmit(message).catch(console.error);
                        }}
                        style={{
                          display: "flex",
                          gap: "8px",
                          padding: "8px 0",
                          width: "100%",
                        }}
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            color: "black",
                            width: "100%",
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingMessageId(null);
                              setEditText("");
                            }
                          }}
                        />
                      </form>
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            className="input-section"
            style={{
              backgroundColor: "white",
              zIndex: 1,
              marginTop: "auto",
              opacity: isDrawerOpen ? 1 : 0,
              visibility: isDrawerOpen ? "visible" : "hidden",
              height: isDrawerOpen ? "auto" : 0,
              transition: "opacity 0.2s ease-in-out",
            }}
          >
            <form
              onSubmit={handleSubmit}
              style={{
                padding: "20px",
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={handleReset}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "1px solid #ddd",
                  backgroundColor: "white",
                  color: "#666",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your query..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  width: "100%",
                }}
              />
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: "0 20px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#007bff",
                  color: "white",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Processing..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </Resizable>
    </Draggable>
  );
};
