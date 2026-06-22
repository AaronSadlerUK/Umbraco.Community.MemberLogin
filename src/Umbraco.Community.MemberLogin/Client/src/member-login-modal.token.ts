import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface MemberLoginModalData {
  memberName: string;
}

export interface MemberLoginModalValue {
  contentKey?: string;
  culture?: string;
}

export const MEMBER_LOGIN_MODAL = new UmbModalToken<MemberLoginModalData, MemberLoginModalValue>(
  "MemberLogin.Modal",
  { modal: { type: "sidebar", size: "small" } },
);
