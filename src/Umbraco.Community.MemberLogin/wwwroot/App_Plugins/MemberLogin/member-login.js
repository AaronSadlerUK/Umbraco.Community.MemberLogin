import { UMB_MEMBER_ENTITY_TYPE as n } from "@umbraco-cms/backoffice/member";
const i = {
  type: "backofficeEntryPoint",
  alias: "MemberLogin.Entrypoint",
  name: "Member Login Entrypoint",
  js: () => import("./entrypoint.js")
}, t = {
  type: "entityAction",
  kind: "default",
  alias: "MemberLogin.EntityAction.Login",
  name: "Member Login Action",
  weight: 100,
  forEntityTypes: [n],
  api: () => import("./member-login.entity-action.js"),
  meta: {
    icon: "icon-operator",
    label: "#memberLogin_action"
  },
  conditions: [
    { alias: "Umb.Condition.SectionAlias", match: "Umb.Section.Members" },
    { alias: "Umb.Condition.CurrentUser.HasAccessToSensitiveData" }
  ]
}, o = {
  type: "modal",
  alias: "MemberLogin.Modal",
  name: "Member Login Modal",
  js: () => import("./member-login-modal.element.js")
}, e = {
  type: "localization",
  alias: "MemberLogin.Lang.En",
  name: "English",
  meta: { culture: "en" },
  js: () => import("./en.js")
}, m = [i, t, o, e];
export {
  m as manifests
};
//# sourceMappingURL=member-login.js.map
