import { UmbEntityActionBase as l } from "@umbraco-cms/backoffice/entity-action";
import { UmbModalToken as b, UMB_MODAL_MANAGER_CONTEXT as p } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as u } from "@umbraco-cms/backoffice/notification";
import { UmbMemberItemRepository as d } from "@umbraco-cms/backoffice/member";
import { UmbLocalizationController as g } from "@umbraco-cms/backoffice/localization-api";
import { c as M } from "./client.gen.js";
const y = new b(
  "MemberLogin.Modal",
  { modal: { type: "sidebar", size: "small" } }
);
class h {
  static postUmbracoManagementApiV1MemberLoginLogin(e) {
    return (e?.client ?? M).post({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/management/api/v1/member-login/login",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e?.headers
      }
    });
  }
}
class C extends l {
  #e = new g(this);
  async execute() {
    const e = this.args.unique;
    if (!e) return;
    const r = new d(this), { data: t } = await r.requestItems([e]), o = t?.[0]?.name ?? "member", a = await this.getContext(p);
    if (!a) return;
    const s = a.open(this, y, { data: { memberName: o } });
    let n;
    try {
      n = await s.onSubmit();
    } catch {
      return;
    }
    const { data: i, error: c } = await h.postUmbracoManagementApiV1MemberLoginLogin({
      body: {
        memberKey: e,
        contentKey: n.contentKey ?? null,
        culture: n.culture ?? null
      }
    });
    i?.redirectUrl ? window.open(i.redirectUrl, "_blank") : await this.#t(c);
  }
  async #t(e) {
    const r = await this.getContext(u), t = e, o = t?.detail ?? t?.title ?? this.#e.term("memberLogin_errorMessage");
    r?.peek("danger", {
      data: { headline: this.#e.term("memberLogin_errorHeadline"), message: o }
    });
  }
}
export {
  C as MemberLoginEntityAction,
  C as default
};
//# sourceMappingURL=member-login.entity-action.js.map
