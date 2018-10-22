import * as deno from "deno";
import { HTTPParser, ParserInfo } from "./parser.ts";
import { Router } from "./router.ts";

export type Address = string;
export type ServerInit = deno.Listener | Address;

export class Server extends Router {
  private listener: deno.Listener;

  constructor() {
    super();
  }

  listen(serverInit: ServerInit) {
    if (typeof serverInit === "string") {
      this.listener = deno.listen("tcp", serverInit);
    } else if (serverInit && serverInit.accept) {
      this.listener = serverInit;
    } else {
      throw new TypeError("Invalid argument passed as ServerInit.");
    }
    this.start();
  }

  private async start() {
    do {
      const conn = await this.listener.accept();
      try {
        await this.handleConn(conn);
      } catch (err) {
        // Handle error.
      }
    } while (true);
  }

  async handleConn(conn: deno.Conn) {
    const parser = new HTTPParser();
    const options: ParserInfo = parser.info;
    const buf = new Uint8Array(65536);


    // Parse headers. (But NOT bodies)
    for (;;) {
      const { nread, eof } = await conn.read(buf);
      parser.execute(buf, 0, nread);
      if (parser.hadError) {
        // Handle error.
      }
      if (eof && !parser.headersCompleted) {
        // Handle error
        break;
      }

      if (parser.headersCompleted) break;
    }

    console.log(JSON.stringify(options, null, 4));

    /**
     * const bodies = new Body();
     * parser.onBody(bodies.parseChunk);
     * bodies.onRequestRead(async () => {
     *   for (;;) {
     *     const { nread, eof } = await conn.read(buf);
     *     if (parser.completed) break;
     *   }
     *   console.log("Parsed all of the body");
     * });
     */

    const request = new Request(options, conn);
    await router.handleURL(options.url, request);

    conn.close();
  }
}

const server = new Server("0.0.0.0:8080");
