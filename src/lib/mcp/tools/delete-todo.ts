import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteTodo } from "@/lib/db/queries";

export function registerDeleteTodo(server: McpServer, userId: string) {
  server.registerTool(
    "delete_todo",
    {
      description: "Delete a todo by ID.",
      inputSchema: {
        id: z.number().int().positive().describe("The todo ID to delete"),
      },
    },
    async ({ id }) => {
      const deleted = await deleteTodo(id, userId);
      if (!deleted) {
        return {
          isError: true,
          content: [{ type: "text", text: `Todo with id ${id} not found.` }],
        };
      }
      return {
        content: [{ type: "text", text: `Todo ${id} deleted successfully.` }],
      };
    }
  );
}
