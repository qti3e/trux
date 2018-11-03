import { Eval, multi } from "../match/match.ts";
import { Methods } from "../http/parser.ts";

type CbFn = (...args: unknown[]) => void | Promise<void>;
type Cb = CbFn | Router;
type URL = string;

let lastId = 0;

export class Router {
  protected isServer = false;
  private patternEval: Eval;
  private routes: Array<[URL, Cb, Methods[]]> = [];

  protected initPatternEval() {
    const patterns = [];
    for (let i = 0; i < routes.length; ++i) {
      const id = lastId++;
      patterns.push([routes[0][0], i]);
    }
    this.patternEval = multi(patterns);
  }

  addRouter(methods: Methods[], url: string, cb: Cb): void {
    this.routes.push([url, cb, methods]);
    if (this.patternEval) {
      // By design hot route modification is expensive and
      // should be avoided.
      // So maybe throw error or print a warning?
      this.initPatternEval();
    }
  }

  use(cb: Cb): void {
    this.addRouter([], "(:_)?", cb);
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
      if (fn instanceof Router) {
        await fn.handle(params["_"], request, response, next);
      } else {
        await fn(request, response, nextCb);
      }
      if (!next) {
        break;
      }
    }
  }
}
