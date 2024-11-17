import { UITool } from "./UITool";
import {
  AgentMessage,
  BaseMessage,
  getNextAgentStep,
  MessageType,
} from "./agent";

export interface ChatMessage extends BaseMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type: MessageType;
  actionCount: number;
}

// We need an intermediate message history PER QUERY and then we need a persistent chat history
// Which will contain the user's initial inputs and the agent's final outputs.
export class AgentRunner {
  private messages: AgentMessage[] = [];

  public chatHistory: ChatMessage[] = [];

  private tools: Record<string, UITool>;

  constructor(tools: UITool[]) {
    this.tools = tools.reduce((acc, tool) => {
      acc[tool.name] = tool;
      return acc;
    }, {} as Record<string, UITool>);
  }

  async processQuery(
    userInput: string,
    maxSteps = 20,
    isEdit = false
  ): Promise<string> {
    /* eslint-disable no-await-in-loop -- Steps must be executed sequentially */

    const messageId = Date.now();

    // Only add to internal messages array - chat history is handled by the component
    if (!isEdit) {
      this.messages.push({
        role: "user",
        content: userInput,
        type: MessageType.Message,
        messageId,
      });
    }

    let stepCount = 0;
    while (stepCount < maxSteps) {
      stepCount += 1;
      const step = await getNextAgentStep(this.messages);

      if (step.type === "message" || step.type === "summary") {
        const finalResponse = step.content ?? "";
        const assistantMessage = {
          role: "assistant",
          content: finalResponse,
          timestamp: Date.now(),
          type: step.type as MessageType,
          messageId,
        };

        // Add to messages without timestamp
        this.messages.push({
          role: assistantMessage.role as "user" | "assistant" | "function",
          content: assistantMessage.content,
          type: assistantMessage.type,
          messageId: assistantMessage.messageId,
        });

        // Add to chat history with timestamp
        this.chatHistory.push(assistantMessage as ChatMessage);
        return finalResponse;
      }

      if (step.type === "tool" && step.tool) {
        const tool = this.tools[step.tool.name];
        if (!tool) {
          throw new Error(`Unknown tool: ${step.tool.name}`);
        }

        const result = await tool.invoke(JSON.stringify(step.tool.result));
        this.messages.push({
          role: "function",
          name: step.tool.name,
          content: JSON.stringify(step.tool.result),
          type: MessageType.Tool,
          messageId,
        });
        this.messages.push({
          role: "assistant",
          content: result,
          type: MessageType.Message,
          messageId,
        });
      }
    }
    const timeoutMessage = `Conversation exceeded maximum of ${maxSteps} steps`;
    this.messages.push({
      role: "assistant",
      content: timeoutMessage,
      type: MessageType.Message,
      messageId,
    });
    /* eslint-enable no-await-in-loop -- Steps must be executed sequentially */

    return timeoutMessage;
  }

  clearHistory(): void {
    this.messages = [];
    this.chatHistory = [];
  }

  replaceMessage(messageId: number, newContent: string): void {
    // Replace in messages array
    const messageIndex = this.messages.findIndex(
      (m) => m.messageId === messageId
    );
    if (messageIndex !== -1) {
      this.messages = this.messages.slice(0, messageIndex + 1);
      this.messages[messageIndex] = {
        ...this.messages[messageIndex],
        content: newContent,
      };
    }

    // Replace in chat history
    const chatIndex = this.chatHistory.findIndex(
      (m) => m.messageId === messageId
    );
    if (chatIndex !== -1) {
      this.chatHistory = this.chatHistory.slice(0, chatIndex + 1);
      this.chatHistory[chatIndex] = {
        ...this.chatHistory[chatIndex],
        content: newContent,
        timestamp: Date.now(),
      };
    }
  }
}
