import { NextRequest, NextResponse } from "next/server";
import { deleteTodo, getTodoById, updateTodo } from "@/lib/db/queries";
import { requireAuth } from "@/utils/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// GET /api/todos/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const todo = await getTodoById(id, auth.user.userId);
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(todo);
}

// PATCH /api/todos/[id]
// Body: { title?: string; completed?: boolean }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const data: { title?: string; completed?: boolean } = {};
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    data.title = title;
  }
  if (typeof body.completed === "boolean") {
    data.completed = body.completed;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const todo = await updateTodo(id, auth.user.userId, data);
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(todo);
}

// DELETE /api/todos/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const deleted = await deleteTodo(id, auth.user.userId);
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
