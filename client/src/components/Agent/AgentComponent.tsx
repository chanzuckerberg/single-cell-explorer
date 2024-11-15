import React, {
  FC,
  useState,
  useMemo,
  FormEvent,
  useRef,
  useEffect,
} from "react";
import { useDispatch, useStore } from "react-redux";
import ReactMarkdown from "react-markdown";
import { AppDispatch } from "../../reducers";
import { createUITools } from "./tools";
import { AgentRunner, ChatMessage } from "./AgentRunner";

export const AgentComponent: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getState } = useStore();
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const agentRunner = useMemo(() => {
    const tools = createUITools(dispatch, getState);
    return new AgentRunner(tools);
  }, [dispatch, getState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsDrawerOpen(true);
    setIsLoading(true);
    const userMessage = {
      role: "user" as const,
      content: input.trim(),
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, userMessage]);

    try {
      await agentRunner.processQuery(input);
      const lastMessage =
        agentRunner.chatHistory[agentRunner.chatHistory.length - 1];
      setChatHistory((prev) => [...prev, lastMessage]);
      setInput("");
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleInputFocus = () => {
    setIsDrawerOpen(true);
  };

  const handleReset = () => {
    setChatHistory([]);
    agentRunner.clearHistory();
    setInput("");
    setIsDrawerOpen(false);
  };

  return (
    <div
      ref={cardRef}
      className="agent-component"
      style={{
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        border: "1px solid #eaeaea",
        backgroundColor: "white",
      }}
      onBlur={(e) => {
        if (!cardRef.current?.contains(e.relatedTarget as Node)) {
          setIsDrawerOpen(false);
        }
      }}
      tabIndex={-1}
    >
      <div
        className="chat-drawer"
        style={{
          transform: `translateY(${
            isDrawerOpen && chatHistory.length > 0 ? "0" : "100%"
          })`,
          opacity: isDrawerOpen && chatHistory.length > 0 ? 1 : 0,
          // transition: "all 0.3s ease",
          backgroundColor: "white",
          visibility:
            isDrawerOpen && chatHistory.length > 0 ? "visible" : "hidden",
          boxShadow:
            isDrawerOpen && chatHistory.length > 0
              ? "0 -8px 24px -4px rgba(0,0,0,0.15)"
              : "none",
          zIndex: 2,
          maxHeight: isDrawerOpen && chatHistory.length > 0 ? "500px" : "0",
          overflow: "hidden",
        }}
      >
        <div
          ref={chatHistoryRef}
          className="chat-history"
          style={{
            height: "auto",
            maxHeight: "500px",
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
              }}
            >
              <div
                style={{
                  padding: "12px",
                  paddingBottom: "0",
                  borderRadius: "12px",
                  backgroundColor:
                    message.role === "user" ? "#007bff" : "#f5f5f5",
                  color: message.role === "user" ? "white" : "black",
                  maxWidth: "70%",
                }}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
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
            onFocus={handleInputFocus}
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
  );
};
