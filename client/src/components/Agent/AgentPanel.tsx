import React, {
  FC,
  useState,
  useMemo,
  FormEvent,
  useRef,
  useEffect,
} from "react";
import { useStore, connect } from "react-redux";
import ReactMarkdown from "react-markdown";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { createUITools } from "./tools";
import { AgentRunner, ChatMessage } from "./AgentRunner";
import { MessageType } from "./agent";
import { AppDispatch, RootState } from "../../reducers";
import { revertToAction } from "../../actions";
import {
  AgentPanelWrapper,
  AgentPanelHeader,
  AgentPanelContent,
  ChatHistory,
  MessageContainer,
  MessageBubble,
  EditButton,
  EditInput,
  ResetButton,
  MessageInput,
  SendButton,
  InputSection,
  InputForm,
  ResizeHandle,
} from "./style";

interface StateProps {
  agentPanelHidden: boolean;
  agentPanelMinimized: boolean;
  actionCount: number;
}

interface DispatchProps {
  dispatch: AppDispatch;
}

type AgentPanelProps = StateProps & DispatchProps;

const mapStateToProps = (state: RootState): StateProps => ({
  agentPanelHidden: state.controls.agentPanelHidden,
  agentPanelMinimized: state.controls.agentPanelMinimized,
  actionCount: state.actionCount,
});

const AgentPanel: FC<AgentPanelProps> = ({
  dispatch,
  agentPanelHidden,
  agentPanelMinimized,
  actionCount,
}) => {
  const { getState } = useStore();
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [firstActionCount, setFirstActionCount] = useState(0);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Resize state
  const [panelHeight, setPanelHeight] = useState<number>(400);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  const agentRunner = useMemo(() => {
    const tools = createUITools(dispatch, getState);
    return new AgentRunner(tools);
  }, [dispatch, getState]);

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

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartHeight(panelHeight);
  };

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      // Get container height from the parent (RightSidebarWrapper)
      // Since the wrapper is absolutely positioned, we need to find its containing block
      let containerHeight = window.innerHeight;
      if (wrapperRef.current) {
        const parent = wrapperRef.current.parentElement;
        if (parent) {
          containerHeight = parent.offsetHeight;
        }
      }
      const maxHeight = containerHeight - 20; // Leave some padding
      const newHeight = Math.max(
        200,
        Math.min(maxHeight, startHeight + deltaY)
      );
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, startY, startHeight]);

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
    <AgentPanelWrapper
      ref={wrapperRef}
      isHidden={agentPanelHidden}
      isMinimized={agentPanelMinimized}
      height={panelHeight}
    >
      <ResizeHandle isDragging={isDragging} onMouseDown={handleMouseDown} />
      <AgentPanelHeader>
        <span>
          <b>CELL x AI</b>
        </span>
        <ButtonGroup>
          <AnchorButton
            active={false}
            data-testid={
              agentPanelMinimized ? "max-agent-panel" : "min-agent-panel"
            }
            minimal
            text=""
            rightIcon={agentPanelMinimized ? "chevron-up" : "chevron-down"}
            onClick={() => {
              dispatch({ type: "minimize/maximize agent panel" });
            }}
          />
          <AnchorButton
            active={false}
            data-testid="close-agent-panel"
            minimal
            text=""
            rightIcon="cross"
            onClick={() =>
              dispatch({
                type: "close agent panel",
              })
            }
          />
        </ButtonGroup>
      </AgentPanelHeader>
      <AgentPanelContent isMinimized={agentPanelMinimized}>
        <ChatHistory ref={chatHistoryRef}>
          {chatHistory.map((message) => (
            <MessageContainer
              key={message.timestamp}
              isUser={message.role === "user"}
            >
              {message.role === "user" && (
                <EditButton
                  type="button"
                  onClick={() => handleEditStart(message)}
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
                </EditButton>
              )}
              <MessageBubble role={message.role} type={message.type}>
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
                    <EditInput
                      ref={editInputRef}
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
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
              </MessageBubble>
            </MessageContainer>
          ))}
        </ChatHistory>
        <InputSection>
          <InputForm onSubmit={handleSubmit}>
            <ResetButton type="button" onClick={handleReset}>
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
            </ResetButton>
            <MessageInput
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your query..."
              disabled={isLoading}
            />
            <SendButton type="submit" disabled={isLoading}>
              {isLoading ? "Processing..." : "Send"}
            </SendButton>
          </InputForm>
        </InputSection>
      </AgentPanelContent>
    </AgentPanelWrapper>
  );
};

export default connect(mapStateToProps)(AgentPanel);
