import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getTodos } from "@/lib/db/queries";

export function registerListTodos(server: McpServer, userId: string) {
  server.registerTool(
    "list_todos",
    {
      description: "List all todos for the authenticated user.",
    },
    async () => {
      const todos = await getTodos(userId);
      return {
        content: [{ type: "text", text: JSON.stringify(todos, null, 2) }],
      };
    }
  );
}
