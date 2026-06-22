import { html, customElement, state, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UmbLanguageCollectionRepository } from "@umbraco-cms/backoffice/language";
import { UmbDocumentItemRepository } from "@umbraco-cms/backoffice/document";
import { UMB_DOCUMENT_PICKER_MODAL } from "@umbraco-cms/backoffice/document";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { MemberLoginModalData, MemberLoginModalValue } from "./member-login-modal.token.js";

interface LanguageOption {
  name: string;
  value: string;
  selected: boolean;
}

@customElement("member-login-modal")
export class MemberLoginModalElement extends UmbModalBaseElement<
  MemberLoginModalData,
  MemberLoginModalValue
> {
  #languageRepository = new UmbLanguageCollectionRepository(this);
  #documentItemRepository = new UmbDocumentItemRepository(this);
  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  @state() private _languages: LanguageOption[] = [];
  @state() private _culture?: string;
  @state() private _pageName?: string;
  @state() private _contentKey?: string;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => {
      this.#modalManager = ctx;
    });
  }

  async connectedCallback() {
    super.connectedCallback();
    const { data } = await this.#languageRepository.requestCollection({ skip: 0, take: 100 });
    if (data && data.items.length > 1) {
      this._languages = data.items.map((l) => ({ name: l.name, value: l.unique, selected: false }));
      // Default to the site's default language, falling back to the first.
      const def = data.items.find((l) => l.isDefault) ?? data.items[0];
      this._culture = def?.unique;
    }
  }

  #onCultureChange(event: Event) {
    this._culture = (event.target as HTMLSelectElement).value;
  }

  async #pickPage() {
    if (!this.#modalManager) return;
    const modal = this.#modalManager.open(this, UMB_DOCUMENT_PICKER_MODAL, {
      data: { multiple: false },
    });
    try {
      const value = await modal.onSubmit();
      const selected = value?.selection?.[0];
      if (!selected) return;
      this._contentKey = selected;

      const { data } = await this.#documentItemRepository.requestItems([selected]);
      const item = data?.[0] as { name?: string; variants?: Array<{ name?: string }> } | undefined;
      this._pageName = item?.variants?.[0]?.name ?? item?.name ?? "Selected page";
    } catch {
      // picker cancelled
    }
  }

  #removePage() {
    this._contentKey = undefined;
    this._pageName = undefined;
  }

  #submit() {
    this.value = { contentKey: this._contentKey, culture: this._culture };
    this._submitModal();
  }

  render() {
    return html`
      <umb-body-layout headline=${this.localize.term("memberLogin_headline")}>
        <uui-box>
          <p>${this.localize.term("memberLogin_confirm", this.data?.memberName)}</p>

          ${this._languages.length > 1
            ? html`
                <uui-label for="culture">${this.localize.term("memberLogin_culture")}</uui-label>
                <uui-select
                  id="culture"
                  label=${this.localize.term("memberLogin_culture")}
                  .options=${this._languages}
                  @change=${this.#onCultureChange}></uui-select>
              `
            : nothing}

          <uui-label>${this.localize.term("memberLogin_redirectPage")}</uui-label>
          ${this._pageName
            ? html`
                <uui-ref-node name=${this._pageName} standalone>
                  <uui-action-bar slot="actions">
                    <uui-button
                      label=${this.localize.term("memberLogin_remove")}
                      @click=${this.#removePage}></uui-button>
                  </uui-action-bar>
                </uui-ref-node>
              `
            : html`
                <uui-button
                  look="placeholder"
                  label=${this.localize.term("memberLogin_add")}
                  @click=${this.#pickPage}></uui-button>
                <small>${this.localize.term("memberLogin_rootHint")}</small>
              `}
        </uui-box>

        <div slot="actions">
          <uui-button label=${this.localize.term("general_cancel")} @click=${this._rejectModal}></uui-button>
          <uui-button
            color="positive"
            look="primary"
            label=${this.localize.term("memberLogin_submit")}
            @click=${this.#submit}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    css`
      uui-label {
        display: block;
        margin-top: var(--uui-size-space-4);
      }
      small {
        display: block;
        color: var(--uui-color-text-alt);
        margin-top: var(--uui-size-space-2);
      }
      uui-select {
        width: 100%;
      }
    `,
  ];
}

export default MemberLoginModalElement;
