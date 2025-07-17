import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// 🎯 Criação do servidor MCP
const server = new Server(
  { name: "my-mcp-sse-server", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

// 📚 Recurso: hora atual
server.resource(
  "current-time",
  undefined,
  async () => ({
    contents: [{
      uri: "time://now",
      text: new Date().toISOString(),
    }],
  })
);

// 🛠️ Ferramenta: ecoa mensagem
server.tool(
  "echo",
  { message: z.string() },
  async ({ message }) => ({
    content: [{ type: "text", text: `Echo: ${message}` }],
  })
);

// 🧩 Prompt: saudação pré-definida
server.prompt(
  "saudação",
  { name: z.string() },
  (args) => ({
    prompt: `Olá ${args.name}, como posso ajudar hoje?`
  })
);

const app = express();
app.use(express.json());

// Estrutura para múltiplas conexões SSE
const transports = {};

// Endpoint SSE para conexão inicial
app.get("/mcp", (req, res) => {
  const transport = new SSEServerTransport("/mcp", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);
  server.connect(transport).catch(console.error);
});

// Endpoint HTTP POST para receber mensagens do cliente
app.post("/mcp", (req, res) => {
  const sid = req.query.sessionId;
  const transport = sid ? transports[sid] : null;
  if (!transport) return res.status(400).json({ error: "sessionId inválido" });
  transport.handlePostMessage(req, res, req.body).catch(err => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });
});

// Inicia o servidor HTTP
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Servidor MCP SSE rodando em http://localhost:${PORT}/mcp`);
});
