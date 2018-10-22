export interface ParserInfo {
  headers: string[];
  upgrade: boolean;
  method?: Methods;
  url?: string;
  versionMajor?: number;
  versionMinor?: number;
  statusCode?: number;
  statusMessage?: string;
  shouldKeepAlive?: boolean;
}

const enum Events {
  kOnHeaders = 0,
  kOnHeadersComplete = 1,
  kOnBody = 2,
  kOnMessageComplete = 3
}

export enum Methods {
  "DELETE",
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "COPY",
  "LOCK",
  "MKCOL",
  "MOVE",
  "PROPFIND",
  "PROPPATCH",
  "SEARCH",
  "UNLOCK",
  "BIND",
  "REBIND",
  "UNBIND",
  "ACL",
  "REPORT",
  "MKACTIVITY",
  "CHECKOUT",
  "MERGE",
  "M-SEARCH",
  "NOTIFY",
  "SUBSCRIBE",
  "UNSUBSCRIBE",
  "PATCH",
  "PURGE",
  "MKCALENDAR",
  "LINK",
  "UNLINK"
}

const headerState = {
  REQUEST_LINE: true,
  RESPONSE_LINE: true,
  HEADER: true
};

const stateFinishAllowed = {
  REQUEST_LINE: true,
  RESPONSE_LINE: true,
  BODY_RAW: true
};

const headerExp = /^([^: \t]+):[ \t]*((?:.*[^ \t])|)/;
const headerContinueExp = /^[ \t]+(.*[^ \t])/;
const requestExp = /^([A-Z-]+) ([^ ]+) HTTP\/(\d)\.(\d)$/;
const responseExp = /^HTTP\/(\d)\.(\d) (\d{3}) ?(.*)$/;

type State =
  | "REQUEST_LINE"
  | "RESPONSE_LINE"
  | "HEADER"
  | "BODY_CHUNKHEAD"
  | "BODY_CHUNKTRAILERS"
  | "BODY_CHUNKEMPTYLINE"
  | "BODY_CHUNK"
  | "BODY_RAW"
  | "BODY_SIZED";

export const REQUEST = "REQUEST";
export const RESPONSE = "RESPONSE";

export class HTTPParser {
  static encoding = "ascii";
  // maxHeaderSize (in bytes) is configurable, but 80kb by default.
  static maxHeaderSize = 80 * 1024;

  private decoder: TextDecoder;
  private state: State;
  private trailers: string[] = [];
  private line = "";
  private isChunked = false;
  private connection = "";
  // For preventing too big headers.
  private headerSize = 0;
  private bodyBytes = null;
  private isUserCall = false;
  private chunk: Uint8Array;
  private offset: number;
  private end: number;

  public hadError = false;
  public headersCompleted = false;
  public completed = false;
  public info: ParserInfo = {
    headers: [],
    upgrade: false
  };

  constructor(private type: "REQUEST" | "RESPONSE" = "REQUEST") {
    if (this.type !== "REQUEST" && this.type !== "RESPONSE") {
      throw new Error("Invalid type passed to HTTPParser.");
    }
    if (this.type == "REQUEST") {
      this.state = "REQUEST_LINE";
    } else {
      this.state = "RESPONSE_LINE";
    }
    this.decoder = new TextDecoder(HTTPParser.encoding);
  }

  private reinitialize(type: "REQUEST" | "RESPONSE") {}

  execute(chunk: Uint8Array, start: number, length: number) {
    this.chunk = chunk;
    this.offset = start;
    let end = this.end = start + length;
    try {
      while(this.offset < end) {
        if (this[this.state]()) {
          break;
        }
      }
    } catch (err) {
      if (this.isUserCall) {
        throw err;
      }
      this.hadError = true;
      return err;
    }
    this.chunk = null;
    length = this.offset - start;
    if (headerState[this.state]) {
      this.headerSize += length;
      if (this.headerSize > HTTPParser.maxHeaderSize) {
        return new Error("max header size exceeded");
      }
    }
    return length;
  }

  private finish() {
    if (this.hadError) {
      return;
    }
    if (!stateFinishAllowed[this.state]) {
      return new Error("invalid state for EOF");
    }
    if (this.state === "BODY_RAW") {
      this.userCall()(this[Events.kOnMessageComplete]());
    }
  }

  private userCall() {
    this.isUserCall = true;
    return ret => {
      this.isUserCall = false;
      return ret;
    }
  }

  private nextRequest() {
    this.userCall()(this[Events.kOnMessageComplete]());
    this.reinitialize(this.type);
  }

  private consumeLine() {
    const end = this.end;
    const chunk = this.chunk;
    const decoder = this.decoder;
    for (let i = this.offset; i < end; ++i) {
      if (chunk[i] === 0x0a) { // \n
        let line = this.line + decoder.decode(chunk.slice(this.offset, i));
        if (line.charAt(line.length - 1) === "\r") {
          line = line.substr(0, line.length - 1);
        }
        this.line = "";
        this.offset = i + 1;
        return line;
      }
    }
    // Line split over multiple chunks.
    this.line += decoder.decode(chunk.slice(this.offset, this.end));
    this.offset = this.end;
  }

  private parseHeader(line: string, headers: string[]) {
    if (line.indexOf("\r") !== -1) {
      throw parseErrorCode("HPE_LF_EXPECTED");
    }

    const match = headerExp.exec(line);
    const k = match && match[1];
    if (k) {
      headers.push(k);
      headers.push(match[2]);
    } else {
      const matchContinue = headerContinueExp.exec(line);
      if (matchContinue && headers.length) {
        if (headers[headers.length - 1]) {
          headers[headers.length - 1] += " ";
        }
        headers[headers.length - 1] += matchContinue[1];
      }
    }
  }

  private REQUEST_LINE(): void {
    const line = this.consumeLine();
    if (!line) {
      return;
    }
    const match = requestExp.exec(line);
    if (match === null) {
      throw parseErrorCode("HPE_INVALID_CONSTANT");
    }
    this.info.method = Methods[match[1]];
    if (this.info.method === -1) {
      throw new Error("invalid request method");
    }
    this.info.url = match[2];
    this.info.versionMajor = Number(match[3]);
    this.info.versionMinor = Number(match[4]);
    this.bodyBytes = 0;
    this.state = "HEADER";
  }

  private RESPONSE_LINE(): void {
    const line = this.consumeLine();
    if (!line) {
      return;
    }
    const match = responseExp.exec(line);
    if (match === null) {
      throw parseErrorCode("HPE_INVALID_CONSTANT");
    }
    this.info.versionMajor = Number(match[1]);
    this.info.versionMinor = Number(match[2]);
    this.info.statusCode = Number(match[3]);
    this.info.statusMessage = match[4];
    const sc = this.info.statusCode;
    // Implied zero length.
    if ((sc / 100 | 0) === 1 || sc === 204 || sc === 304) {
      this.bodyBytes = 0;
    }
    this.state = "HEADER";
  }

  private shouldKeepAlive(): boolean {
    if (this.info.versionMajor > 0 && this.info.versionMinor > 0) {
      if (this.connection.indexOf("close") !== -1) {
        return false;
      }
    } else if (this.connection.indexOf("keep-alive") === -1) {
      return false;
    }
    if (this.bodyBytes !== null || this.isChunked) { // || skipBody
      return true;
    }
    return false;
  }

  // TODO Refactor this function.
  private HEADER() {
    const line = this.consumeLine();
    if (line === undefined) {
      return;
    }
    const info = this.info;
    if (line) {
      this.parseHeader(line, info.headers);
    } else {
      const { headers } = info;
      let hasContentLength = false;
      let currentContentLengthValue;
      let hasUpgradeHeader = false;
      for (var i = 0; i < headers.length; i += 2) {
        switch (headers[i].toLowerCase()) {
          case 'transfer-encoding':
            this.isChunked = headers[i + 1].toLowerCase() === 'chunked';
            break;
          case 'content-length':
            currentContentLengthValue = +headers[i + 1];
            if (hasContentLength) {
              // Fix duplicate Content-Length header with same values.
              // Throw error only if values are different.
              // Known issues:
              // https://github.com/request/request/issues/2091#issuecomment-328715113
              // https://github.com/nodejs/node/issues/6517#issuecomment-216263771
              if (currentContentLengthValue !== this.bodyBytes) {
                throw parseErrorCode('HPE_UNEXPECTED_CONTENT_LENGTH');
              }
            } else {
              hasContentLength = true;
              this.bodyBytes = currentContentLengthValue;
            }
            break;
          case 'connection':
            this.connection += headers[i + 1].toLowerCase();
            break;
          case 'upgrade':
            hasUpgradeHeader = true;
            break;
        }
      }

      // See https://github.com/creationix/http-parser-js/pull/53
      // if both isChunked and hasContentLength, content length wins
      // because it has been verified to match the body length already
      if (this.isChunked && hasContentLength) {
        this.isChunked = false;
      }

      // Logic from https://github.com/nodejs/http-parser/blob/921d5585515a153fa00e411cf144280c59b41f90/http_parser.c#L1727-L1737
      // "For responses, "Upgrade: foo" and "Connection: upgrade" are
      //   mandatory only when it is a 101 Switching Protocols response,
      //   otherwise it is purely informational, to announce support.
      if (hasUpgradeHeader && this.connection.indexOf('upgrade') != -1) {
        info.upgrade = this.type === REQUEST || info.statusCode === 101;
      } else {
        info.upgrade = info.method === Methods.CONNECT;
      }

      info.shouldKeepAlive = this.shouldKeepAlive();
      //problem which also exists in original node: we should know skipBody before calling onHeadersComplete
      var skipBody;
      skipBody = this.userCall()(this[Events.kOnHeadersComplete](info));
      if (skipBody === 2) {
        this.nextRequest();
        return true;
      } else if (this.isChunked && !skipBody) {
        this.state = 'BODY_CHUNKHEAD';
      } else if (skipBody || this.bodyBytes === 0) {
        this.nextRequest();
        // For older versions of node (v6.x and older?), that return skipBody=1 or skipBody=true,
        //   need this "return true;" if it's an upgrade request.
        return info.upgrade;
      } else if (this.bodyBytes === null) {
        this.state = 'BODY_RAW';
      } else {
        this.state = 'BODY_SIZED';
      }
    }
  }

  private BODY_CHUNKHEAD(): void {
    const line = this.consumeLine();
    if (line === undefined) {
      return;
    }
    this.bodyBytes = parseInt(line, 16);
    if (!this.bodyBytes) {
      this.state = "BODY_CHUNKTRAILERS";
    } else {
      this.state = "BODY_CHUNK";
    }
  }

  private BODY_CHUNKEMPTYLINE(): void {
    const line = this.consumeLine();
    if (line === undefined) {
      return;
    }
    if (line !== "") {
      throw new Error("Assertation failed.");
    }
    this.state = "BODY_CHUNKHEAD";
  }

  private BODY_CHUNKTRAILERS(): void {
    const line = this.consumeLine();
    if (line === undefined) {
      return;
    }
    if (line) {
      this.parseHeader(line, this.trailers);
    } else {
      if (this.trailers.length) {
        this.userCall()(this[Events.kOnHeaders](this.trailers));
      }
      this.nextRequest();
    }
  }

  private BODY_RAW(): void {
    const length = this.end - this.offset;
    this.userCall()(this[Events.kOnBody](this.chunk, this.offset, length));
    this.offset = this.end;
  }

  private BODY_SIZED(): void {
    const length = Math.min(this.end - this.offset, this.bodyBytes);
    this.userCall()(this[Events.kOnBody](this.chunk, this.offset, length));
    this.offset += length;
    this.bodyBytes -= length;
    if (!this.bodyBytes) {
      this.nextRequest();
    }
  }

  [Events.kOnHeadersComplete](info: ParserInfo) {
    this.headersCompleted = true;
  }

  [Events.kOnMessageComplete]() {
    this.completed = true;
  }

  [Events.kOnHeaders](trailers: string[]) {}
  [Events.kOnBody](buf: Uint8Array, start: number, end: number) {}

  onHeaders(cb: (trailers: string[]) => void): void {
    this[Events.kOnHeaders] = cb;
  }

  onBody(cb: (buf: Uint8Array, start: number, end: number) => void): void {
    this[Events.kOnBody] = cb;
  }
}

function parseErrorCode(code) {
  var err = new Error('Parse Error');
  err["code"] = code;
  return err;
}
