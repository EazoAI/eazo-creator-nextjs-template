import { desc, eq, and } from "drizzle-orm";
import { db } from "../client";
import { todos, type Todo } from "../schema/todos";

export async function getTodos(userId: string): Promise<Todo[]> {
  return db
    .select()
    .from(todos)
    .where(eq(todos.userId, userId))
    .orderBy(desc(todos.createdAt));
}

export async function getTodoById(id: number, userId: string): Promise<Todo | undefined> {
  const rows = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function createTodo(userId: string, title: string): Promise<Todo> {
  const rows = await db.insert(todos).values({ userId, title }).returning();
  return rows[0];
}

export async function updateTodo(
  id: number,
  userId: string,
  data: { title?: string; completed?: boolean; attachmentKey?: string | null; attachmentUrl?: string | null }
): Promise<Todo | undefined> {
  if (Object.keys(data).length === 0) return getTodoById(id, userId);

  const rows = await db
    .update(todos)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();

  return rows[0];
}

export async function deleteTodo(id: number, userId: string): Promise<boolean> {
  const rows = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning({ id: todos.id });
  return rows.length > 0;
}
