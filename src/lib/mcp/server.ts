import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerListTodos,
  registerGetTodo,
  registerCreateTodo,
  registerUpdateTodo,
  registerDeleteTodo,
} from "./tools";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "eazo-todos",
    version: "1.0.0",
  });

  registerListTodos(server, userId);
  registerGetTodo(server, userId);
  registerCreateTodo(server, userId);
  registerUpdateTodo(server, userId);
  registerDeleteTodo(server, userId);

  return server;
}
