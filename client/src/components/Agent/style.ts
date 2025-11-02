import styled from "@emotion/styled";

export const AgentPanelWrapper = styled.div<{
  isHidden: boolean;
  isMinimized: boolean;
  height?: number;
}>`
  display: ${(props) => (props.isHidden ? "none" : "flex")};
  flex-direction: column;
  height: ${(props) =>
    props.isMinimized ? "auto" : props.height ? `${props.height}px` : "100%"};
  min-height: ${(props) =>
    props.isMinimized ? "auto" : props.height ? `${props.height}px` : "100%"};
  max-height: ${(props) =>
    props.isMinimized ? "auto" : props.height ? `${props.height}px` : "100%"};
  flex-shrink: 0;
  flex-grow: 0;
  border-top: 1px solid #e5e5e5;
  background-color: white;
  overflow: hidden;
  position: relative;
`;

export const AgentPanelHeader = styled.div`
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

export const AgentPanelContent = styled.div<{
  isMinimized: boolean;
}>`
  display: ${(props) => (props.isMinimized ? "none" : "flex")};
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

export const ChatHistory = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const InputSection = styled.div`
  padding: 20px;
  border-top: 1px solid #eaeaea;
  background-color: white;
  flex-shrink: 0;
`;

export const InputForm = styled.form`
  display: flex;
  gap: 10px;
`;

export const ResetButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background-color: white;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;

  &:hover {
    background-color: #f5f5f5;
  }
`;

export const MessageInput = styled.input`
  flex: 1;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  width: 100%;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

export const SendButton = styled.button<{ disabled: boolean }>`
  padding: 0 20px;
  border-radius: 4px;
  border: none;
  background-color: #007bff;
  color: white;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background-color: #0056b3;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

export const MessageContainer = styled.div<{ isUser: boolean }>`
  display: flex;
  justify-content: ${(props) => (props.isUser ? "flex-end" : "flex-start")};
  width: 100%;
  position: relative;
`;

export const MessageBubble = styled.div<{ role: string; type: string }>`
  padding: 12px;
  padding-bottom: 0;
  border-radius: 12px;
  background-color: ${(props) =>
    props.role === "user"
      ? "#007bff"
      : props.type === "summary"
      ? "#e3f2fd"
      : "#f5f5f5"};
  color: ${(props) => (props.role === "user" ? "white" : "black")};
  max-width: 70%;
  word-wrap: break-word;
`;

export const EditButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background-color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 1;

  &:hover {
    background-color: #f5f5f5;
  }
`;

export const EditInput = styled.input`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  color: black;
  width: 100%;
`;

export const ResizeHandle = styled.div<{ isDragging: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  background-color: ${(props) =>
    props.isDragging ? "rgba(0, 123, 255, 0.3)" : "transparent"};
  z-index: 10;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(0, 123, 255, 0.2);
  }

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 2px;
    background-color: ${(props) =>
      props.isDragging ? "#007bff" : "rgba(0, 0, 0, 0.2)"};
    border-radius: 1px;
    transition: background-color 0.15s ease;
  }

  &:hover::after {
    background-color: #007bff;
  }
`;
