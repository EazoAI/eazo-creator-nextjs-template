import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateTodo } from "@/lib/db/queries";

export function registerUpdateTodo(server: McpServer, userId: string) {
  server.registerTool(
    "update_todo",
    {
      description: "Update an existing todo's title and/or completion status.",
      inputSchema: {
        id: z.number().int().positive().describe("The todo ID to update"),
        title: z.string().min(1).optional().describe("New title"),
        completed: z.boolean().optional().describe("New completion status"),
      },
    },
    async ({ id, title, completed }) => {
      const todo = await updateTodo(id, userId, { title, completed });
      if (!todo) {
        return {
          isError: true,
          content: [{ type: "text", text: `Todo with id ${id} not found.` }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
      };
    }
  );
}
