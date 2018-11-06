import * as deno from "deno";
import { status } from "./status.ts";

const encoder = new TextEncoder("utf-8");

export class Response {
  readonly headers = new Headers();
  readonly sentHeaders = false;
  readonly closed = false;
  status: number = 200;
  private pendingWrites = 0;
  private askedClose = false;

  constructor(public conn: deno.Conn) {
    this.headers.set("Content-Type", "text/html; charset=utf-8");
    this.headers.set("Connection", "keep-alive");
  }

  private async sendHeaders() {
    if (this.sentHeaders) {
      throw new Error("Headers are already being sent.");
    }
    Object.assign(this, { sentHeaders: true });
    const statusStr = status(this.status);
    const headers = [`HTTP/1.1 ${this.status} ${statusStr}`];
    this.headers.forEach((value, key) => {
      headers.push(key + ": " + value);
    });
    await this.write(headers.join("\r\n") + "\r\n\r\n");
  }

  end() {
    if (!this.sentHeaders) {
      this.sendHeaders();
    }
    if (this.pendingWrites > 0) {
      this.askedClose = true;
      return;
    }
    this.conn.close();
  }

  async write(str: string): Promise<number>;
  async write(buf: ArrayBufferView): Promise<number>;
  async write(data): Promise<number> {
    if (!this.sentHeaders) {
      this.sendHeaders();
    }
    if (typeof data === "string") {
      return this.write(encoder.encode(data));
    }
    ++this.pendingWrites;
    const ret = await this.conn.write(data);
    --this.pendingWrites;
    if (this.askedClose && this.pendingWrites === 0) {
      this.end();
    }
    return ret;
  }
}
