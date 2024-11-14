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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsDrawerOpen(true);
    setIsLoading(true);
    try {
      await agentRunner.processQuery(input);
      setChatHistory([...agentRunner.chatHistory]);
      setInput("");
    } catch (error) {
      setChatHistory([
        ...agentRunner.chatHistory,
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

  return (
    <div
      ref={cardRef}
      className="agent-component"
      style={{
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
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
          transition: "all 0.3s ease",
          backgroundColor: "white",
          visibility:
            isDrawerOpen && chatHistory.length > 0 ? "visible" : "hidden",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="chat-history"
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            padding: "20px 20px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          {chatHistory.map((message) => (
            <div
              key={message.timestamp}
              style={{
                padding: "8px",
                margin: "4px 0",
                borderRadius: "4px",
                backgroundColor:
                  message.role === "user" ? "#e3f2fd" : "#f5f5f5",
              }}
            >
              <strong>{message.role === "user" ? "You" : "Assistant"}: </strong>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ))}
        </div>
      </div>
      <div
        className="input-section"
        style={{
          backgroundColor: "white",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
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
