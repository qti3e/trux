import * as deno from "deno";
import { HTTPParser, ParserInfo } from "./parser.ts";
import { Router, bootstrap } from "../router/router.ts";
import { Request } from "./request.ts";
import { Response } from "./response.ts";

export type Address = string;
export type ServerInit = deno.Listener | Address;

let bootstrapTimeout: number;

const buffers: Uint8Array[] = [];

export class Server<
  Req extends Request = Request,
  Res extends Response = Response> extends Router<Req, Res> {
  private listener: deno.Listener;

  constructor() {
    super();
    if (!bootstrapTimeout) {
      bootstrapTimeout = setTimeout(() => {
        bootstrap();
      }, 10);
    }
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

  private async handleConn(conn: deno.Conn) {
    const parser = new HTTPParser();
    const options: ParserInfo = parser.info;
    const buf = buffers.pop() || (new Uint8Array(65536));

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

    const request = new Request(options) as Req;
    const response = new Response(conn) as Res;
    // This function is slow af, TODO: FIX
    await this.handle(options.url, request, response);

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

    response.end();
    buffers.push(buf);
  }
}

