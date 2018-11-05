import { Eval, multi, hasUnderscore } from "../match/match.ts";
import { Methods } from "../http/parser.ts";

type CbFn = (req: null, res: null, next: () => void) => void | Promise<void>;
type Cb = CbFn | Router;
type URL = string;

export class Router {
  protected isServer = false;
  private patternEval: Eval;
  private routes: Array<[URL, Cb, Methods[]]> = [];

  protected initPatternEval() {
    const patterns = [];
    for (let i = 0; i < this.routes.length; ++i) {
      patterns.push([this.routes[i][0], i]);
    }
    console.log(patterns);
    this.patternEval = multi(patterns);
  }

  constructor() {
    setTimeout(() => {
      this.initPatternEval();
    }, 10);
  }

  addRouter(methods: Methods[], url: string, cb: Cb): void {
    if (cb instanceof Router) { 
      if (!hasUnderscore(url)) {
        url += "/(:_)?";
      }
    }

    this.routes.push([url, cb, methods]);

    if (this.patternEval) {
      // By design hot route modification is expensive and
      // should be avoided.
      // So maybe throw an error or print a warning?
      // TODO(qti3e) Throw error and tell users to use foreUpdate().
      // foreUpdate should call initPatternEval directly.
      this.initPatternEval();
    }
  }

  use(cb: Cb): void {
    this.addRouter([], "/(:_)?", cb);
  }

  any(url: string, cb: Cb): void {
    this.addRouter([], url, cb);
  }

  post(url: string, cb: Cb): void {
    this.addRouter([Methods.POST], url, cb);
  }

  get(url: string, cb: Cb): void {
    this.addRouter([Methods.GET], url, cb);
  }

  put(url: string, cb: Cb): void {
    this.addRouter([Methods.PUT], url, cb);
  }

  delete(url: string, cb: Cb): void {
    this.addRouter([Methods.DELETE], url, cb);
  }

  async handle(url, request, response, _next?) {
    const next = _next || { next: false };
    const nextCb = () => next.next = true;
    const iter = this.patternEval.matchAll(url);
    for (const { params, end } of iter) {
      next.next = false;
      const [ _, fn, methods ] = this.routes[end];
      if (methods.length) {
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
