import { UITool } from "./UITool";
import { AgentMessage, getNextAgentStep } from "./agent";

export class AgentRunner {
  private messages: AgentMessage[] = [];

  private tools: Record<string, UITool>;

  constructor(tools: UITool[]) {
    this.tools = tools.reduce((acc, tool) => {
      acc[tool.name] = tool;
      return acc;
    }, {} as Record<string, UITool>);
  }

  async processQuery(userInput: string, maxSteps = 20): Promise<string> {
    /* eslint-disable no-await-in-loop -- Steps must be executed sequentially */
    this.messages.push({
      role: "user",
      content: userInput,
    });

    let stepCount = 0;
    while (stepCount < maxSteps) {
      try {
        stepCount += 1;
        const step = await getNextAgentStep(this.messages);

        if (step.type === "final") {
          this.messages.push({
            role: "assistant",
            content: step.content,
          });
          return step.content;
        }

        if (step.type === "tool" && step.tool) {
          const tool = this.tools[step.tool.name];
          if (!tool) {
            throw new Error(`Unknown tool: ${step.tool.name}`);
          }

          const result = await tool.invoke(JSON.stringify(step.tool.arguments));
          this.messages.push({
            role: "function",
            name: step.tool.name,
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
    /* eslint-enable no-await-in-loop -- Steps must be executed sequentially */
    const timeoutMessage = `Conversation exceeded maximum of ${maxSteps} steps`;
    this.messages.push({
      role: "assistant",
      content: timeoutMessage,
    });
    return timeoutMessage;
  }
}
