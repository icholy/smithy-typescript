import http from "node:http";
import https from "node:https";
import { HttpRequest } from "@smithy/core/protocols";
import { afterEach, describe, expect, test as it, vi } from "vitest";

import { NodeHttpHandler } from "./node-http-handler";

// Interception libraries (nock, MSW, OpenTelemetry) patch the live node:http /
// node:https module objects at runtime. That only works if the handler resolves
// `request` off the module object at call time (default import), not via a named
// import that binds a copy at load time. `vi.spyOn` reproduces that runtime patch;
// `vi.mock` would not, since it patches the loader and passes the broken build too.
describe("NodeHttpHandler runtime interception", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["http:", http],
    ["https:", https],
  ])("invokes a runtime-patched %s request", async (protocol, module) => {
    const spy = vi.spyOn(module, "request").mockImplementation(() => {
      throw new Error("intercepted");
    });

    await new NodeHttpHandler()
      .handle(
        new HttpRequest({
          protocol,
          hostname: "localhost",
          method: "GET",
          path: "/",
          headers: {},
        })
      )
      .catch(() => {});

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
