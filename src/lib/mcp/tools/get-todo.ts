import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getTodoById } from "@/lib/db/queries";

export function registerGetTodo(server: McpServer, userId: string) {
  server.registerTool(
    "get_todo",
    {
      description: "Get a single todo by ID.",
      inputSchema: {
        id: z.number().int().positive().describe("The todo ID"),
      },
    },
    async ({ id }) => {
      const todo = await getTodoById(id, userId);
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
