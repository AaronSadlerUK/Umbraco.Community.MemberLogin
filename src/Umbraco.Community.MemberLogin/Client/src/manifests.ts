import { UMB_MEMBER_ENTITY_TYPE } from "@umbraco-cms/backoffice/member";
import { MEMBER_LOGIN_SENSITIVE_DATA_CONDITION_ALIAS } from "./member-login.sensitive-data.condition.constants.js";

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
    { alias: MEMBER_LOGIN_SENSITIVE_DATA_CONDITION_ALIAS },
  ],
};

const sensitiveDataCondition = {
  type: "condition",
  name: "Member Login: Current User Has Access To Sensitive Data Condition",
  alias: MEMBER_LOGIN_SENSITIVE_DATA_CONDITION_ALIAS,
  api: () => import("./member-login.sensitive-data.condition.js"),
};

const modal = {
  type: "modal",
  alias: "MemberLogin.Modal",
  name: "Member Login Modal",
  js: () => import("./member-login-modal.element.js"),
};

const englishLang = {
  type: "localization",
  alias: "MemberLogin.Lang.En",
  name: "English",
  meta: { culture: "en" },
  js: () => import("./lang/en.js"),
};

export const manifests = [entrypoint, entityAction, sensitiveDataCondition, modal, englishLang];
