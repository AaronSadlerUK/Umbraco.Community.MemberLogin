import { UmbEntityActionBase } from "@umbraco-cms/backoffice/entity-action";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UmbMemberItemRepository } from "@umbraco-cms/backoffice/member";
import { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";
import { MEMBER_LOGIN_MODAL } from "./member-login-modal.token.js";
import { V1 } from "./api/index.js";

export class MemberLoginEntityAction extends UmbEntityActionBase<never> {
  #localize = new UmbLocalizationController(this);

  async execute() {
    const unique = this.args.unique;
    if (!unique) return;

    // Resolve the member name for the modal headline.
    const itemRepository = new UmbMemberItemRepository(this);
    const { data } = await itemRepository.requestItems([unique]);
    const memberName = data?.[0]?.name ?? "member";

    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    if (!modalManager) return;

    const modal = modalManager.open(this, MEMBER_LOGIN_MODAL, { data: { memberName } });

    let value;
    try {
      value = await modal.onSubmit();
    } catch {
      return; // modal cancelled
    }

    const { data: result, error } = await V1.postUmbracoManagementApiV1MemberLoginLogin({
      body: {
        memberKey: unique,
        contentKey: value.contentKey ?? null,
        culture: value.culture ?? null,
      },
    });

    if (result?.redirectUrl) {
      window.open(result.redirectUrl, "_blank");
    } else {
      await this.#notifyError(error);
    }
  }

  async #notifyError(error: unknown) {
    const notificationContext = await this.getContext(UMB_NOTIFICATION_CONTEXT);
    const problem = error as { detail?: string; title?: string } | undefined;
    const message = problem?.detail ?? problem?.title ?? this.#localize.term("memberLogin_errorMessage");
    notificationContext?.peek("danger", {
      data: { headline: this.#localize.term("memberLogin_errorHeadline"), message },
    });
  }
}

export default MemberLoginEntityAction;
