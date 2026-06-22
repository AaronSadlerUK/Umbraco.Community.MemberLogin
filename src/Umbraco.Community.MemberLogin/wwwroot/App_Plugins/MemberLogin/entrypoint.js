import { UMB_AUTH_CONTEXT as t } from "@umbraco-cms/backoffice/auth";
import { c as i } from "./client.gen.js";
const c = (o) => {
  o.consumeContext(t, (e) => {
    if (!e) return;
    const n = e.getOpenApiConfiguration();
    i.setConfig({
      baseUrl: n.base,
      credentials: n.credentials,
      auth: n.token
    });
  });
};
export {
  c as onInit
};
//# sourceMappingURL=entrypoint.js.map
