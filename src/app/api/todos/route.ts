import { NextRequest, NextResponse } from "next/server";
import { createTodo, getTodos } from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth";

// GET /api/todos
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const data = await getTodos(auth.user.userId);
  return NextResponse.json(data);
}

// POST /api/todos
// Body: { title: string }
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const todo = await createTodo(auth.user.userId, title);
  return NextResponse.json(todo, { status: 201 });
}
