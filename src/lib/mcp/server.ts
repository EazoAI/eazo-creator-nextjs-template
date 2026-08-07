import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function buildMcpServer(userId: string): McpServer {
  void userId;

  const server = new McpServer({
    name: "eazo-mcp",
    version: "1.0.0",
  });

  // Register your tools here after adding files under src/lib/mcp/tools/.
  //   import { registerMyTool } from "./tools/my-tool";
  //   registerMyTool(server, userId);

  return server;
}
