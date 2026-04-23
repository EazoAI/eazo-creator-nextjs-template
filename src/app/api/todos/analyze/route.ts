import { NextRequest } from "next/server";
import { getTodos } from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";

ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });

// POST /api/todos/analyze
// Streams an AI analysis of the authenticated user's todo list as SSE.
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const todos = await getTodos(auth.user.id);

  const done = todos.filter((t) => t.completed);
  const pending = todos.filter((t) => !t.completed);

  const todoSummary = [
    `Total: ${todos.length} todos (${done.length} completed, ${pending.length} pending)`,
    "",
    pending.length > 0
      ? `Pending:\n${pending.map((t) => `- ${t.title}`).join("\n")}`
      : "No pending todos.",
    done.length > 0
      ? `\nCompleted:\n${done.map((t) => `- ${t.title}`).join("\n")}`
      : "",
  ]
    .join("\n")
    .trim();

  const stream = await ai.chat({
    model: "deepseek.v3.1",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful productivity coach. Analyze the user's todo list and provide concise, actionable insights. Be encouraging, practical, and brief (3-5 short paragraphs max). Use plain text, no markdown.",
      },
      {
        role: "user",
        content: `Here is my current todo list:\n\n${todoSummary}\n\nPlease analyze it and give me insights on my productivity, priorities, and suggestions for what to focus on next.`,
      },
    ],
    stream: true,
    max_tokens: 512,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
