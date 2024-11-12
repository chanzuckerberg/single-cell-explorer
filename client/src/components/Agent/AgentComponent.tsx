import React, { FC, useState, useMemo, FormEvent } from "react";
import { useDispatch, useStore } from "react-redux";
import { AppDispatch } from "../../reducers";
import { createUITools } from "./tools";
import { AgentRunner } from "./AgentRunner";

export const AgentComponent: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getState } = useStore();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
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
      const result = await agentRunner.processQuery(input);
      setResponse(result);
      setInput("");
    } catch (error) {
      setResponse(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };
  console.log("isLoading", isLoading);
  return (
    <div className="agent-component" style={{ marginTop: "100px" }}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your query..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Send"}
        </button>
      </form>
      {response && <div className="response">{response}</div>}
    </div>
  );
};
