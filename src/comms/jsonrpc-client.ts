import { createClient } from "redis";
import type { JSONRPCRequest, JSONRPCResponse } from "./types";
import { randomUUID } from "crypto";

const DEFAULT_REQUEST_CHANNEL = "server_request_channel";

/**
 * Handler para requisições pendentes do cliente JSON-RPC.
 * @private
 */
type PendingHandler = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout?: NodeJS.Timeout;
};

/**
 * JSON-RPC Pub/Sub Client for asynchronous communication over Redis.
 * Each client instance generates a unique reply channel for receiving responses.
 */
export class JSONRPCPubSubClient {
  requestChannel: string;

  private pub;
  private sub;
  private pending: Map<string, PendingHandler> = new Map();
  private listening = false;
  private notificationHandlers: Map<string, (params: any) => void> = new Map();
  private responseChannel: string;

  /**
   * Creates a new JSONRPCPubSubClient.
   * @param channel Used for replyChannel construction (response isolation).
   * @param requestChannel Optional: central request channel (default: 'server_request_channel').
   * @param url Optional Redis connection URL (default: 'redis://localhost:6379').
   */
  constructor(channel: string, url = "redis://localhost:6379") {
    this.pub = createClient({ url });
    this.sub = createClient({ url });
    this.responseChannel = `${channel}:resp:${randomUUID()}`;
    this.requestChannel = channel ?? DEFAULT_REQUEST_CHANNEL;
  }

  /**
   * Connects the client to Redis and starts listening for responses.
   */
  async connect() {
    await this.pub.connect();
    await this.sub.connect();
    if (!this.listening) {
      this.listening = true;
      await this.sub.subscribe(this.responseChannel, (message) => {
        let res: JSONRPCResponse | JSONRPCRequest;
        try {
          res = JSON.parse(message);
        } catch {
          return;
        }
        if (!("id" in res) && "method" in res) {
          const handler = this.notificationHandlers.get(res.method);
          if (handler) handler((res as any).params);
          return;
        }
        if (res.id && this.pending.has(String(res.id))) {
          if ("error" in res && res.error) {
            this.pending
              .get(String(res.id))!
              .reject(new Error(res.error.message));
          } else {
            this.pending.get(String(res.id))!.resolve(res);
          }
          this.pending.delete(String(res.id));
        }
      });
    }
  }

  /**
   * Disconnects the client from Redis.
   */
  async disconnect() {
    await this.pub.quit();
    await this.sub.quit();
  }

  /**
   * Performs a JSON-RPC call and waits for the response.
   * @param method The remote method name.
   * @param params Optional parameters for the method.
   * @param timeoutMs Optional timeout in milliseconds (default: 5000ms).
   * @returns A promise that resolves with the JSON-RPC response.
   */
  call(method: string, params?: any, timeoutMs = 5000): Promise<any> {
    const id = Math.random().toString(36).slice(2);
    const req: JSONRPCRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id,
      replyChannel: this.responseChannel,
    };
    return new Promise((resolve, reject) => {
      const handler: PendingHandler = { resolve, reject };
      if (timeoutMs) {
        handler.timeout = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error("Timeout"));
        }, timeoutMs);
      }
      this.pending.set(id, handler);
      this.pub.publish(this.requestChannel, JSON.stringify(req));
    });
  }
}
