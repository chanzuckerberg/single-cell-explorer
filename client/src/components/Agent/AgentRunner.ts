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
    // this.messages = this.chatHistory.map((msg) => ({
    //   role: msg.role,
    //   content: msg.content,
    // }));
    console.log(this.messages);

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
      stepCount += 1;
      const step = await getNextAgentStep(this.messages);

      if (step.type === "final") {
        const finalResponse = step.content ?? "";
        this.chatHistory.push({
          role: "assistant",
          content: finalResponse,
          timestamp: Date.now(),
        });
        this.messages.push({
          role: "assistant",
          content: finalResponse,
        });
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
        });
        this.messages.push({
          role: "assistant",
          content: `Status message: ${result}`,
        });
      }
    }
    /* eslint-enable no-await-in-loop -- Steps must be executed sequentially */
    const timeoutMessage = `Conversation exceeded maximum of ${maxSteps} steps`;
    this.messages.push({
      role: "assistant",
      content: timeoutMessage,
    });
    return timeoutMessage;
  }

  clearHistory(): void {
    this.messages = [];
    this.chatHistory = [];
  }
}
