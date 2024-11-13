import React, { FC, useState, useMemo, FormEvent } from "react";
import { useDispatch, useStore } from "react-redux";
import { AppDispatch } from "../../reducers";
import { createUITools } from "./tools";
import { AgentRunner, ChatMessage } from "./AgentRunner";

export const AgentComponent: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getState } = useStore();
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const agentRunner = useMemo(() => {
    const tools = createUITools(dispatch, getState);
    return new AgentRunner(tools);
  }, [dispatch, getState]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
    }
  };
  return (
    <div
      className="agent-component"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "20px",
        backgroundColor: "white",
      }}
    >
      <div
        className="chat-history"
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          marginBottom: "20px",
        }}
      >
        {chatHistory.map((message) => (
          <div
            key={message.timestamp}
            style={{
              padding: "8px",
              margin: "4px 0",
              borderRadius: "4px",
              backgroundColor: message.role === "user" ? "#e3f2fd" : "#f5f5f5",
            }}
          >
            <strong>{message.role === "user" ? "You" : "Assistant"}: </strong>
            {message.content}
          </div>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        style={{ width: "100%", display: "flex", gap: "10px" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your query..."
          disabled={isLoading}
          style={{ flex: 1, padding: "8px" }}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Send"}
        </button>
      </form>
    </div>
  );
};
