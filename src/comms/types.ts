export interface JSONRPCRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id?: string | number | null;
  replyChannel?: string;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: { code: number; message: string; data?: any };
  id: string | number | null;
}
