import { nothing as k, html as u, css as w, state as _, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as z, UMB_MODAL_MANAGER_CONTEXT as E } from "@umbraco-cms/backoffice/modal";
import { UmbLanguageCollectionRepository as N } from "@umbraco-cms/backoffice/language";
import { UmbDocumentItemRepository as O, UMB_DOCUMENT_PICKER_MODAL as P } from "@umbraco-cms/backoffice/document";
var D = Object.defineProperty, x = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, r = (e, a, t, l) => {
  for (var i = l > 1 ? void 0 : l ? x(a, t) : a, p = e.length - 1, d; p >= 0; p--)
    (d = e[p]) && (i = (l ? d(a, t, i) : d(i)) || i);
  return l && i && D(a, t, i), i;
}, b = (e, a, t) => a.has(e) || f("Cannot " + t), h = (e, a, t) => (b(e, a, "read from private field"), t ? t.call(e) : a.get(e)), c = (e, a, t) => a.has(e) ? f("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), K = (e, a, t, l) => (b(e, a, "write to private field"), a.set(e, t), t), m = (e, a, t) => (b(e, a, "access private method"), t), g, v, s, n, y, M, $, L;
let o = class extends z {
  constructor() {
    super(), c(this, n), c(this, g, new N(this)), c(this, v, new O(this)), c(this, s), this._languages = [], this.consumeContext(E, (e) => {
      K(this, s, e);
    });
  }
  async connectedCallback() {
    super.connectedCallback();
    const { data: e } = await h(this, g).requestCollection({ skip: 0, take: 100 });
    if (e && e.items.length > 1) {
      this._languages = e.items.map((t) => ({ name: t.name, value: t.unique, selected: !1 }));
      const a = e.items.find((t) => t.isDefault) ?? e.items[0];
      this._culture = a?.unique;
    }
  }
  render() {
    return u`
      <umb-body-layout headline=${this.localize.term("memberLogin_headline")}>
        <uui-box>
          <p>${this.localize.term("memberLogin_confirm", this.data?.memberName)}</p>

          ${this._languages.length > 1 ? u`
                <uui-label for="culture">${this.localize.term("memberLogin_culture")}</uui-label>
                <uui-select
                  id="culture"
                  label=${this.localize.term("memberLogin_culture")}
                  .options=${this._languages}
                  @change=${m(this, n, y)}></uui-select>
              ` : k}

          <uui-label>${this.localize.term("memberLogin_redirectPage")}</uui-label>
          ${this._pageName ? u`
                <uui-ref-node name=${this._pageName} standalone>
                  <uui-action-bar slot="actions">
                    <uui-button
                      label=${this.localize.term("memberLogin_remove")}
                      @click=${m(this, n, $)}></uui-button>
                  </uui-action-bar>
                </uui-ref-node>
              ` : u`
                <uui-button
                  look="placeholder"
                  label=${this.localize.term("memberLogin_add")}
                  @click=${m(this, n, M)}></uui-button>
                <small>${this.localize.term("memberLogin_rootHint")}</small>
              `}
        </uui-box>

        <div slot="actions">
          <uui-button label=${this.localize.term("general_cancel")} @click=${this._rejectModal}></uui-button>
          <uui-button
            color="positive"
            look="primary"
            label=${this.localize.term("memberLogin_submit")}
            @click=${m(this, n, L)}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
g = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakSet();
y = function(e) {
  this._culture = e.target.value;
};
M = async function() {
  if (!h(this, s)) return;
  const e = h(this, s).open(this, P, {
    data: { multiple: !1 }
  });
  try {
    const t = (await e.onSubmit())?.selection?.[0];
    if (!t) return;
    this._contentKey = t;
    const { data: l } = await h(this, v).requestItems([t]), i = l?.[0];
    this._pageName = i?.variants?.[0]?.name ?? i?.name ?? "Selected page";
  } catch {
  }
};
$ = function() {
  this._contentKey = void 0, this._pageName = void 0;
};
L = function() {
  this.value = { contentKey: this._contentKey, culture: this._culture }, this._submitModal();
};
o.styles = [
  w`
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
    `
];
r([
  _()
], o.prototype, "_languages", 2);
r([
  _()
], o.prototype, "_culture", 2);
r([
  _()
], o.prototype, "_pageName", 2);
r([
  _()
], o.prototype, "_contentKey", 2);
o = r([
  C("member-login-modal")
], o);
const W = o;
export {
  o as MemberLoginModalElement,
  W as default
};
//# sourceMappingURL=member-login-modal.element.js.map
