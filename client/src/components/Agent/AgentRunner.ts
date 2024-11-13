import { UITool } from "./UITool";
import { AgentMessage, getNextAgentStep } from "./agent";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

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

  async processQuery(userInput: string, maxSteps = 20): Promise<string> {
    /* eslint-disable no-await-in-loop -- Steps must be executed sequentially */
    this.messages = []; // Reset intermediate messages for new query

    // Add the user's message to both histories
    const userMessage = {
      role: "user" as const,
      content: userInput,
    };
    this.messages.push(userMessage);
    this.chatHistory.push({
      ...userMessage,
      timestamp: Date.now(),
    });

    let stepCount = 0;
    while (stepCount < maxSteps) {
      try {
        stepCount += 1;
        const step = await getNextAgentStep(this.messages);

        if (step.type === "final") {
          const finalResponse = step.content ?? "";
          this.chatHistory.push({
            role: "assistant",
            content: finalResponse,
            timestamp: Date.now(),
          });
          return finalResponse;
        }

        if (step.type === "tool" && step.tool) {
          const tool = this.tools[step.tool.name];
          if (!tool) {
            throw new Error(`Unknown tool: ${step.tool.name}`);
          }
          this.messages.push({
            role: "function",
            name: step.tool.name,
            content: `The following tool was invoked: ${
              step.tool.name
            }. The result of the tool invocation is: ${JSON.stringify(
              step.tool.result
            )}`,
          });
          const result = await tool.invoke(JSON.stringify(step.tool.result));
          this.messages.push({
            role: "assistant",
            content: result,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        this.messages.push({
          role: "assistant",
          content: `Error: ${errorMessage}`,
        });
        return `Error: ${errorMessage}`;
      }
    }
    const timeoutMessage = `Conversation exceeded maximum of ${maxSteps} steps`;
    this.messages.push({
      role: "assistant",
      content: timeoutMessage,
    });
    return timeoutMessage;
  }
}
