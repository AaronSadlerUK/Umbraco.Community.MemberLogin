import type { UmbEntryPointOnInit } from "@umbraco-cms/backoffice/extension-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { client } from "./api/client.gen.js";

export const onInit: UmbEntryPointOnInit = (host) => {
  // Configure the generated OpenAPI client with the backoffice bearer token,
  // so authenticated calls to the member-login management API succeed.
  host.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
    if (!authContext) return;
    const config = authContext.getOpenApiConfiguration();
    client.setConfig({
      baseUrl: config.base,
      credentials: config.credentials,
      auth: config.token,
    });
  });
};
