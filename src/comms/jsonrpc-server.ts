import { createClient } from "redis";
import type { JSONRPCRequest, JSONRPCResponse } from "./types";

const REQUEST_CHANNEL = "server_request_channel";

/**
 * JSON-RPC Pub/Sub Server for handling requests and sending responses over Redis.
 * Listens on a base channel and responds to the reply channel specified by each client.
 */
export class JSONRPCPubSubServer {
  requestChannel: string;

  private pub;
  private sub;
  private handlers: Map<string, (req: JSONRPCRequest) => Promise<any>> =
    new Map();

  /**
   * Creates a new JSONRPCPubSubServer.
   * @param url Optional Redis connection URL (default: 'redis://localhost:6379').
   */
  constructor(channel = REQUEST_CHANNEL, url = "redis://localhost:6379") {
    this.pub = createClient({ url });
    this.sub = createClient({ url });
    this.requestChannel = channel;
  }

  /**
   * Connects the server to Redis.
   */
  async connect() {
    await this.pub.connect();
    await this.sub.connect();
  }

  /**
   * Registers a handler for a JSON-RPC method.
   * The server can register multiple methods.
   * @param method The method name to handle.
   * @param handler Async function to process the request and return the result.
   */
  async listen(method: string, handler: (req: JSONRPCRequest) => Promise<any>) {
    this.handlers.set(method, handler);
    await this.sub.subscribe(this.requestChannel, async (message) => {
      let req: JSONRPCRequest;
      try {
        req = JSON.parse(message);
      } catch {
        return;
      }
      let response: JSONRPCResponse = { jsonrpc: "2.0", id: req.id ?? null };
      const fn = this.handlers.get(req.method);
      if (fn) {
        try {
          response.result = await fn(req);
        } catch (e: any) {
          response.error = {
            code: -32000,
            message: e?.message || "Internal error",
          };
        }
      } else {
        response.error = {
          code: -32601,
          message: "Method not found",
        };
      }
      if (req.id) {
        const replyChannel = req.replyChannel ?? "default";
        await this.pub.publish(replyChannel, JSON.stringify(response));
      }
    });
  }

  /**
   * Disconnects the server from Redis.
   */
  async disconnect() {
    await this.pub.quit();
    await this.sub.quit();
  }
}
