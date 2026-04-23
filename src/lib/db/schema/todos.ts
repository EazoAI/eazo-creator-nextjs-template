import type { InferSelectModel } from "drizzle-orm";
import { boolean, index, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const todos = pgTable(
  "todos",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    attachmentKey: text("attachment_key"),
    attachmentUrl: text("attachment_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("todos_user_id_idx").on(table.userId),
    completedIdx: index("todos_completed_idx").on(table.completed),
    createdAtIdx: index("todos_created_at_idx").on(table.createdAt),
  })
);

export type Todo = InferSelectModel<typeof todos>;
