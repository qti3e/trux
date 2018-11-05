import * as deno from "deno";

export class Response {
  readonly headers = new Headers();
  status = 200;

  constructor(public conn: deno.Conn) {
  }

  private writeHead() {
  }

  write(buf: ArrayBufferView): Promise<number> {
    return this.conn.write(buf);
  }
}
