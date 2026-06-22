import { UmbEntityActionBase } from "@umbraco-cms/backoffice/entity-action";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UmbMemberItemRepository } from "@umbraco-cms/backoffice/member";
import { MEMBER_LOGIN_MODAL } from "./member-login-modal.token.js";
import { V1 } from "./api/index.js";

export class MemberLoginEntityAction extends UmbEntityActionBase<never> {
  async execute() {
    const unique = this.args.unique;
    if (!unique) return;

    // Resolve the member name for the modal headline.
    const itemRepository = new UmbMemberItemRepository(this);
    const { data } = await itemRepository.requestItems([unique]);
    const memberName = data?.[0]?.name ?? "member";

    // Open the target window synchronously on the user gesture so it is not
    // blocked as a popup after the awaited API call below.
    const win = window.open("", "_blank");

    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    if (!modalManager) {
      win?.close();
      return;
    }

    const modal = modalManager.open(this, MEMBER_LOGIN_MODAL, { data: { memberName } });

    try {
      const value = await modal.onSubmit();

      const { data: result } = await V1.postUmbracoManagementApiV1MemberLoginLogin({
        body: {
          memberKey: unique,
          contentKey: value.contentKey ?? null,
          culture: value.culture ?? null,
        },
      });

      if (result?.redirectUrl && win) {
        win.location.href = result.redirectUrl;
      } else {
        win?.close();
        await this.#notifyError();
      }
    } catch {
      // Modal cancelled or the API call failed.
      win?.close();
    }
  }

  async #notifyError() {
    const notificationContext = await this.getContext(UMB_NOTIFICATION_CONTEXT);
    notificationContext?.peek("danger", {
      data: {
        headline: "Member login failed",
        message: "Could not sign in as this member. The redirect page may not be published.",
      },
    });
  }
}

export default MemberLoginEntityAction;
