import { UmbEntityActionBase as l } from "@umbraco-cms/backoffice/entity-action";
import { UmbModalToken as d, UMB_MODAL_MANAGER_CONTEXT as b } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as u } from "@umbraco-cms/backoffice/notification";
import { UmbMemberItemRepository as p } from "@umbraco-cms/backoffice/member";
import { c as g } from "./client.gen.js";
const M = new d(
  "MemberLogin.Modal",
  { modal: { type: "sidebar", size: "small" } }
);
class y {
  static postUmbracoManagementApiV1MemberLoginLogin(e) {
    return (e?.client ?? g).post({
      url: "/umbraco/management/api/v1/member-login/login",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e?.headers
      }
    });
  }
}
class L extends l {
  async execute() {
    const e = this.args.unique;
    if (!e) return;
    const r = new p(this), { data: s } = await r.requestItems([e]), m = s?.[0]?.name ?? "member", t = window.open("", "_blank"), n = await this.getContext(b);
    if (!n) {
      t?.close();
      return;
    }
    const c = n.open(this, M, { data: { memberName: m } });
    try {
      const o = await c.onSubmit(), { data: a } = await y.postUmbracoManagementApiV1MemberLoginLogin({
        body: {
          memberKey: e,
          contentKey: o.contentKey ?? null,
          culture: o.culture ?? null
        }
      });
      a?.redirectUrl && t ? t.location.href = a.redirectUrl : (t?.close(), await this.#e());
    } catch {
      t?.close();
    }
  }
  async #e() {
    (await this.getContext(u))?.peek("danger", {
      data: {
        headline: "Member login failed",
        message: "Could not sign in as this member. The redirect page may not be published."
      }
    });
  }
}
export {
  L as MemberLoginEntityAction,
  L as default
};
//# sourceMappingURL=member-login.entity-action.js.map
