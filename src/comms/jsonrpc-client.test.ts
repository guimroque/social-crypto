import test from "node:test";
import assert from "node:assert";
import { JSONRPCPubSubClient } from "./jsonrpc-client";
import { JSONRPCPubSubServer } from "./jsonrpc-server";
import type { JSONRPCRequest } from "./types";
import { randomBytes, randomUUID } from "node:crypto";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("JSON-RPC PubSub fluxo básico", async (t) => {
  const server = new JSONRPCPubSubServer();
  await server.connect();
  await server.listen(
    "soma",
    async (req: JSONRPCRequest) => req.params.a + req.params.b
  );

  await server.listen("erro", async (_req: JSONRPCRequest) => {
    throw new Error("Erro esperado");
  });

  const client = new JSONRPCPubSubClient(server.requestChannel);
  await client.connect();

  const soma = await client.call("soma", { a: 2, b: 3 });
  assert.strictEqual(soma.result, 5);

  await assert.rejects(() => client.call("erro"), /Erro esperado/);
  await client.disconnect();
  await server.disconnect();
});

test("JSON-RPC custom channel", async (t) => {
  const channel = randomUUID();
  const server = new JSONRPCPubSubServer(channel);
  await server.connect();
  await server.listen(
    "soma",
    async (req: JSONRPCRequest) => req.params.a + req.params.b
  );

  await server.listen("erro", async (_req: JSONRPCRequest) => {
    throw new Error("Erro esperado");
  });

  const client = new JSONRPCPubSubClient(server.requestChannel);
  await client.connect();

  const soma = await client.call("soma", { a: 2, b: 3 });
  assert.strictEqual(soma.result, 5);

  await assert.rejects(() => client.call("erro"), /Erro esperado/);
  await client.disconnect();
  await server.disconnect();
});
