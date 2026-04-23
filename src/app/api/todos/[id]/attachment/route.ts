import { NextRequest, NextResponse } from "next/server";
import { getTodoById, updateTodo } from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * PATCH /api/todos/[id]/attachment
 * Body: { key: string; url: string } — S3 key and permanent CDN URL returned
 * by storage.upload() in the client.
 *
 * The frontend uploads directly to S3 via the SDK presigned URL, then calls
 * this route to persist the resulting key and URL in the database.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const existing = await getTodoById(id, auth.user.id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await request.json().catch(() => null) as { key?: unknown; url?: unknown } | null;
  if (!body || typeof body.key !== "string" || typeof body.url !== "string") {
    return NextResponse.json({ error: "key and url are required" }, { status: 400 });
  }

  const todo = await updateTodo(id, auth.user.id, {
    attachmentKey: body.key,
    attachmentUrl: body.url,
  });

  return NextResponse.json(todo);
}

/**
 * DELETE /api/todos/[id]/attachment
 * Clears the attachment from the database record.
 * (Actual S3 object deletion can be handled separately or via a cleanup job.)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const existing = await getTodoById(id, auth.user.id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const todo = await updateTodo(id, auth.user.id, {
    attachmentKey: null,
    attachmentUrl: null,
  });

  return NextResponse.json(todo);
}
