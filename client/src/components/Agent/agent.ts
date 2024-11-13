import { z } from "zod";

const AgentStepResponseSchema = z.object({
  type: z.enum(["tool", "final"]),
  tool: z
    .object({
      name: z.string(),
      result: z.record(z.string(), z.string()),
    })
    .optional(),
  content: z.string().optional(),
});

export type AgentStepResponse = z.infer<typeof AgentStepResponseSchema>;

export type AgentMessage = {
  role: "user" | "assistant" | "function";
  content: string;
  name?: string;
};

export async function getNextAgentStep(
  messages: AgentMessage[],
  toolResults?: string
): Promise<AgentStepResponse> {
  const response = await fetch(
    `${window.CELLXGENE.API.prefix}${window.CELLXGENE.API.version}agent/step`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, toolResults }),
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json();
  return AgentStepResponseSchema.parse(data);
}
