import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createTodo } from "@/lib/db/queries";

export function registerCreateTodo(server: McpServer, userId: string) {
  server.registerTool(
    "create_todo",
    {
      description: "Create a new todo.",
      inputSchema: {
        title: z.string().min(1).describe("The title of the new todo"),
      },
    },
    async ({ title }) => {
      const todo = await createTodo(userId, title);
      return {
        content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
      };
    }
  );
}
