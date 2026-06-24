import { UmbConditionBase } from "@umbraco-cms/backoffice/extension-registry";
import type {
  UmbConditionConfigBase,
  UmbConditionControllerArguments,
  UmbExtensionCondition,
} from "@umbraco-cms/backoffice/extension-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { MEMBER_LOGIN_SENSITIVE_DATA_CONDITION_ALIAS } from "./member-login.sensitive-data.condition.constants.js";

export { MEMBER_LOGIN_SENSITIVE_DATA_CONDITION_ALIAS };

/**
 * Permits an extension only when the current backoffice user has access to
 * sensitive data. Self-contained so the package owns this condition and does
 * not rely on it being registered elsewhere.
 */
export class MemberLoginSensitiveDataCondition
  extends UmbConditionBase<UmbConditionConfigBase>
  implements UmbExtensionCondition
{
  constructor(
    host: UmbControllerHost,
    args: UmbConditionControllerArguments<UmbConditionConfigBase>,
  ) {
    super(host, args);

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      this.observe(context?.currentUser, (user) => {
        this.permitted = user?.hasAccessToSensitiveData ?? false;
      });
    });
  }
}

export { MemberLoginSensitiveDataCondition as api };
export default MemberLoginSensitiveDataCondition;
