import * as deno from "deno";
import { HTTPParser, ParserInfo } from "./parser.ts";
import { Router, bootstrap } from "../router/router.ts";
import { Request } from "./request.ts";
import { Response } from "./response.ts";

export type Address = string;
export type ServerInit = deno.Listener | Address;

let bootstrapTimeout: number;

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
    // TODO(qti3e) Reuse buf
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

    const request = new Request(options) as Req;
    const response = new Response(conn) as Res;
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

    const res_headers = `HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Connection: keep-alive
Access-Control-Allow-Origin: *
Vary: Accept-Encoding,Cookie

`.split(/\r?\n/g).join("\r\n");

    const encoder = new TextEncoder("utf-8");
    const res_headers_buf = encoder.encode(res_headers);
    await conn.write(res_headers_buf);
    await conn.write(encoder.encode("Hello " + options.url + "\n"));
    conn.close();
  }
}

const server = new Server();
server.get("/", req => {
  console.log("/");
});
server.get("/hi", req => {
  console.log("/hi");
});
server.get("/hi/:r", req => {
  console.log("/hi/" + req.parameters.r);
  console.log(req.parameters);
  console.log(req);
});
server.listen("0.0.0.0:8080");
