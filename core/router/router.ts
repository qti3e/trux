import { Eval, multi, hasUnderscore } from "../match/match.ts";
import { Methods } from "../http/parser.ts";

interface Request {
  method: Methods;
  setParams(params: Record<string, string>): void;
}

type NextCb = () => void;
type CbReturn = void | Promise<void>;
type CbFn<Req, Res> = (req: Req, res: Res, next: NextCb) => CbReturn;
type Cb<Req extends Request, Res> = CbFn<Req, Res> | Router<Req, Res>;
type URL = string;

const routers: Router<Request, unknown>[] = [];

export function bootstrap() {
  for (let i = 0; i < routers.length; ++i) {
    routers[i].forceUpdate();
  }
  // Remove refrences to routers, so that we don't
  // prevent a Router from being garbage collected.
  routers.splice(0);
}

export class Router<Req extends Request, Res> {
  private patternEval: Eval;
  private routes: Array<[URL, Cb<Req, Res>, Methods[]]> = [];
  private updated = false;

  protected initPatternEval() {
    const patterns = [];
    for (let i = 0; i < this.routes.length; ++i) {
      patterns.push([this.routes[i][0], i]);
    }
    this.patternEval = multi(patterns);
  }

  constructor() {
    routers.push(this);
  }

  forceUpdate() {
    if (!this.updated) {
      this.initPatternEval();
      this.updated = true;
    }
  }

  addRouter(methods: Methods[], url: string, cb: Cb<Req, Res>): void {
    if (cb instanceof Router) { 
      if (!hasUnderscore(url)) {
        url += "(/:_)?";
      }
    }

    this.routes.push([url, cb, methods]);
    this.updated = false;

    if (this.patternEval) {
      // By design hot route modification is expensive and should be avoided.
      throw new Error("Hot-route modification should be avoided," +
        " Consider using Router.forceUpdate() to apply changes.");
    }
  }

  use(cb: Cb<Req, Res>): void;
  use(url: string, cb: Cb<Req, Res>): void;
  use() {
    if (arguments.length === 1) {
      this.addRouter([], "(/:_)?", arguments[0]);
    } else {
      this.addRouter([], arguments[0] + "(/:_)?", arguments[1]);
    }
  }

  any(url: string, cb: Cb<Req, Res>): void {
    this.addRouter([], url, cb);
  }

  post(url: string, cb: Cb<Req, Res>): void {
    this.addRouter([Methods.POST], url, cb);
  }

  get(url: string, cb: Cb<Req, Res>): void {
    this.addRouter([Methods.GET], url, cb);
  }

  put(url: string, cb: Cb<Req, Res>): void {
    this.addRouter([Methods.PUT], url, cb);
  }

  delete(url: string, cb: Cb<Req, Res>): void {
    this.addRouter([Methods.DELETE], url, cb);
  }

  async handle(
    url: string,
    request: Req,
    response: Res,
    _next?: { next: boolean }
  ): Promise<void> {
    const next = _next || { next: false };
    const nextCb = () => next.next = true;
    const iter = this.patternEval.matchAll(url);
    for (const { params, end } of iter) {
      next.next = false;
      const [ _, fn, methods ] = this.routes[end];
      if (methods.length) {
        // TODO(qti3e) Use bit mask.
        if (methods.indexOf(request.method) < 0) {
          continue;
        }
      }
      request.setParams(params);
      const nextURL = "/" + (params["_"] || "");
      if (fn instanceof Router) {
        await fn.handle(nextURL, request, response, next);
      } else {
        await fn(request, response, nextCb);
      }
      if (!next.next) {
        break;
      }
    }
  }
}
