import { ParserInfo, Methods } from "../http/parser.ts";

export class Request {
  readonly headers;
  readonly method: Methods;
  readonly parameters: Readonly<Record<string, string>>;

  constructor(opts: ParserInfo) {
    this.method = opts.method;
    const headersInit = [];
    for (let i = 0; i < opts.headers.length; i += 2) {
      headersInit.push([opts.headers[i], opts.headers[i + 1]]);
    }
    this.headers = new Headers(headersInit);
  }

  setParams(parameters: Record<string, string>): void {
    Object.assign(this, { parameters });
  }
}
