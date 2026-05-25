import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
  type NextResponse as NextResponseType,
} from "next/server";
import type {
  ComposableMiddleware,
  GenericMatcher,
  NextComposableMiddleware,
} from "./types";

export function composeMiddlewares<E, Req, Res, T = unknown>(
  ...middlewares: Array<ComposableMiddleware<E, Req, Res, T>>
): (request: Req, event: E, initialResponse: Res) => Promise<Res> {
  return async (request, event, initialResponse) => {
    let response = initialResponse;
    let prevLocals: Record<string, unknown> = {};

    for (const [index, entry] of middlewares.entries()) {
      const { matcher, middleware } = entry;

      if (!matcher(request)) continue;

      try {
        const nextResult = await middleware({
          event,
          middlewareLocalValues: prevLocals,
          request,
          response,
        });

        if (!nextResult) continue;

        const { middlewareLocalValues, next, stop } = nextResult;

        if (next) response = next;
        if (middlewareLocalValues) prevLocals = middlewareLocalValues;
        if (stop) return response;
      } catch (error) {
        console.error("composeMiddlewares error at index", index, {
          error_name: (error as Error)?.name,
          error_message: (error as Error)?.message,
        });
      }
    }

    return response;
  };
}

export const composeOptionalMatchers = <Req>(
  ...matchers: Array<GenericMatcher<Req>>
): GenericMatcher<Req> => {
  return (request) => matchers.some((matcher) => matcher(request));
};

export const composeRequiredMatchers = <Req>(
  ...matchers: Array<GenericMatcher<Req>>
): GenericMatcher<Req> => {
  return (request) => matchers.every((matcher) => matcher(request));
};

export function composeNextMiddlewares(
  ...middlewares: Array<NextComposableMiddleware>
): (request: NextRequest, event: NextFetchEvent) => Promise<NextResponseType> {
  return async (request, event) => {
    const initialResponse: NextResponseType = NextResponse.next({ request });
    return composeMiddlewares<NextFetchEvent, NextRequest, NextResponseType>(
      ...middlewares,
    )(request, event, initialResponse);
  };
}
