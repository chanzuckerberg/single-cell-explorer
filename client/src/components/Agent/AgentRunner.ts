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

    const userMessageId = Date.now();

    // Ensure user message is in messages array
    // When editing, replaceMessage should have already updated it, but we need to ensure
    // it's present before calling getNextAgentStep
    if (isEdit) {
      // When editing, find the last user message and ensure it matches the edited content
      let lastUserMessageIndex = -1;
      for (let i = this.messages.length - 1; i >= 0; i -= 1) {
        if (this.messages[i].role === "user") {
          lastUserMessageIndex = i;
          break;
        }
      }
      if (lastUserMessageIndex !== -1) {
        // Update the existing user message with edited content
        this.messages[lastUserMessageIndex] = {
          ...this.messages[lastUserMessageIndex],
          content: userInput,
        };
      } else {
        // If no user message found (shouldn't happen), add it
        this.messages.push({
          role: "user",
          content: userInput,
          type: MessageType.Message,
          messageId: userMessageId,
        });
      }
    } else {
      // Add new user message to messages array
      this.messages.push({
        role: "user",
        content: userInput,
        type: MessageType.Message,
        messageId: userMessageId,
      });
    }

    let stepCount = 0;
    while (stepCount < maxSteps) {
      stepCount += 1;
      const step = await getNextAgentStep(this.messages);

      if (step.type === "message" || step.type === "summary") {
        const assistantMessageId = Date.now();
        const finalResponse = step.content ?? "";
        const assistantMessage = {
          role: "assistant",
          content: finalResponse,
          timestamp: Date.now(),
          type: step.type as MessageType,
          messageId: assistantMessageId,
        };

        // Add to messages without timestamp
        this.messages.push({
          role: assistantMessage.role as "user" | "assistant" | "function",
          content: assistantMessage.content,
          type: assistantMessage.type,
          messageId: assistantMessageId,
        });

        // Add to chat history with timestamp
        this.chatHistory.push(assistantMessage as ChatMessage);
        return finalResponse;
      }

      if (step.type === "tool" && step.tool && step.assistant_tool_use) {
        const toolMessageId = Date.now();
        const tool = this.tools[step.tool.name];
        if (!tool) {
          throw new Error(`Unknown tool: ${step.tool.name}`);
        }

        // First, add the assistant's tool_use message (what Anthropic sent)
        this.messages.push({
          role: "assistant",
          content: JSON.stringify(step.assistant_tool_use.tool_input),
          type: MessageType.Tool,
          messageId: toolMessageId,
          tool_use_id: step.assistant_tool_use.tool_use_id,
          name: step.assistant_tool_use.tool_name,
        });

        // Then execute the tool and add the result
        const result = await tool.invoke(JSON.stringify(step.tool.result));
        this.messages.push({
          role: "function",
          name: step.tool.name,
          content: JSON.stringify(step.tool.result),
          type: MessageType.Tool,
          messageId: toolMessageId + 1,
          tool_use_id: step.tool.tool_use_id,
        });

        // Finally, add the UI confirmation message
        this.messages.push({
          role: "assistant",
          content: result,
          type: MessageType.Message,
          messageId: toolMessageId + 2,
        });
      }
    }
    const timeoutMessage = `Conversation exceeded maximum of ${maxSteps} steps`;
    this.messages.push({
      role: "assistant",
      content: timeoutMessage,
      type: MessageType.Message,
      messageId: Date.now(),
    });
    /* eslint-enable no-await-in-loop -- Steps must be executed sequentially */

    return timeoutMessage;
  }

  clearHistory(): void {
    this.messages = [];
    this.chatHistory = [];
  }

  replaceMessage(
    messageId: number,
    newContent: string,
    actionCount: number
  ): void {
    // Find the message in both arrays
    const messageIndex = this.messages.findIndex(
      (m) => m.messageId === messageId
    );
    const chatIndex = this.chatHistory.findIndex(
      (m) => m.messageId === messageId
    );

    // Truncate arrays to the edited message (inclusive)
    // The backend will find the last summary message to split chat history vs current request
    if (messageIndex !== -1) {
      // Truncate to include everything up to and including the edited message
      this.messages = this.messages.slice(0, messageIndex + 1);

      // Update the edited message content
      this.messages[messageIndex] = {
        ...this.messages[messageIndex],
        content: newContent,
      };
    }

    if (chatIndex !== -1) {
      // Truncate to include everything up to and including the edited message
      this.chatHistory = this.chatHistory.slice(0, chatIndex + 1);

      // Update the edited message content
      this.chatHistory[chatIndex] = {
        ...this.chatHistory[chatIndex],
        content: newContent,
        timestamp: Date.now(),
        actionCount,
      };
    }
  }
}
