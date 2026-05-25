import type { NextFetchEvent, NextRequest, NextResponse } from "next/server";

export type ComposableMiddlewareParams<
  E = unknown,
  Req = unknown,
  Res = unknown,
> = {
  event: E;
  middlewareLocalValues: Record<string, unknown>;
  request: Req;
  response: Res;
};

export type ComposableMiddlewareResult<_, Res = unknown> = {
  middlewareLocalValues?: Record<string, unknown>;
  next?: Res;
  stop?: boolean;
};

export type ComposableMiddleware<
  E = unknown,
  Req = unknown,
  Res = unknown,
  T = unknown,
> = {
  matcher: (request: Req) => boolean;
  middleware: (
    params: ComposableMiddlewareParams<E, Req, Res>,
  ) => Promise<ComposableMiddlewareResult<T, Res> | undefined>;
};

export type GenericMatcher<Req = unknown> = (request: Req) => boolean;

export type NextComposableMiddleware<T = unknown> = ComposableMiddleware<
  NextFetchEvent,
  NextRequest,
  NextResponse,
  T
>;
