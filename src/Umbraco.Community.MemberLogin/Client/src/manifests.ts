import { UMB_MEMBER_ENTITY_TYPE } from "@umbraco-cms/backoffice/member";

const entrypoint = {
  type: "backofficeEntryPoint",
  alias: "MemberLogin.Entrypoint",
  name: "Member Login Entrypoint",
  js: () => import("./entrypoint.js"),
};

const entityAction = {
  type: "entityAction",
  kind: "default",
  alias: "MemberLogin.EntityAction.Login",
  name: "Member Login Action",
  weight: 100,
  forEntityTypes: [UMB_MEMBER_ENTITY_TYPE],
  api: () => import("./member-login.entity-action.js"),
  meta: {
    icon: "icon-operator",
    label: "#memberLogin_action",
  },
  conditions: [
    { alias: "Umb.Condition.SectionAlias", match: "Umb.Section.Members" },
    { alias: "Umb.Condition.CurrentUser.HasAccessToSensitiveData" },
  ],
};

const modal = {
  type: "modal",
  alias: "MemberLogin.Modal",
  name: "Member Login Modal",
  js: () => import("./member-login-modal.element.js"),
};

const englishLang = {
  type: "localization",
  alias: "MemberLogin.Lang.EnGb",
  name: "English (UK)",
  meta: { culture: "en-gb" },
  js: () => import("./lang/en.js"),
};

export const manifests = [entrypoint, entityAction, modal, englishLang];
