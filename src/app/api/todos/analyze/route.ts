import { NextRequest } from "next/server";
import { getTodos } from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth";
import { appAi, AppAIUnavailableError, APP_AI_UNAVAILABLE_MESSAGE } from "@/lib/eazo-ai-billing";
import { getRequestLocale } from "@/lib/i18n/server-locale";

// POST /api/todos/analyze
// Streams an AI analysis of the authenticated user's todo list as SSE.
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const todos = await getTodos(auth.user.id);
  const locale = getRequestLocale(request);

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

  const systemPrompt =
    locale === "zh-CN"
      ? "你是一位高效的生产力教练。请分析用户的待办清单，给出简洁、可执行的建议。语气积极、务实，控制在 3-5 个短段落内。使用纯文本，不要使用 Markdown。"
      : "You are a helpful productivity coach. Analyze the user's todo list and provide concise, actionable insights. Be encouraging, practical, and brief (3-5 short paragraphs max). Use plain text, no markdown.";

  const userPrompt =
    locale === "zh-CN"
      ? `以下是我当前的待办清单：\n\n${todoSummary}\n\n请分析我的效率、优先级，并给出下一步建议。`
      : `Here is my current todo list:\n\n${todoSummary}\n\nPlease analyze it and give me insights on my productivity, priorities, and suggestions for what to focus on next.`;

  let stream;
  try {
    stream = await appAi.chat({
      model: process.env.EAZO_AI_MODEL_KEY || "deepseek.v3.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: 512,
    });
  } catch (error) {
    if (error instanceof AppAIUnavailableError) {
      return Response.json(
        { code: "app_ai_unavailable", message: APP_AI_UNAVAILABLE_MESSAGE },
        { status: 402 },
      );
    }
    throw error;
  }

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
