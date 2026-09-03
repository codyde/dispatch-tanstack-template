import { chat, maxIterations, toolDefinition } from "@tanstack/ai"
import { createAnthropicChatWithClient } from "@tanstack/ai-anthropic"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

const client = new Anthropic({ apiKey: null, authToken: process.env.AI_API_KEY, baseURL: process.env.AI_BASE_URL })
const adapter = createAnthropicChatWithClient("claude-sonnet-5" as never, client as never)

const echoTool = toolDefinition({
  name: "echo",
  description: "Echo a string back. Always call this once.",
  inputSchema: z.object({ text: z.string() }),
}).server(async ({ input }: any) => {
  console.log("TOOL EXECUTED:", input.text)
  return { echoed: input.text }
})

const stream = chat({
  adapter: adapter as never,
  messages: [{ role: "user", content: "Call the echo tool with text=hello-dispatch, then reply DONE." }] as never,
  tools: [echoTool] as never,
  agentLoopStrategy: maxIterations(5),
} as never)

for await (const chunk of stream as AsyncIterable<any>) {
  const c = { ...chunk }
  if (typeof c.content === "string" && c.content.length > 60) c.content = c.content.slice(0, 60) + "…"
  console.log("CHUNK", JSON.stringify(c).slice(0, 260))
}
