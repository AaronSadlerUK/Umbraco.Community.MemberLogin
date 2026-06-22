import { nothing as k, html as r, css as E, state as d, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as L, UMB_MODAL_MANAGER_CONTEXT as N } from "@umbraco-cms/backoffice/modal";
import { UmbLanguageCollectionRepository as R } from "@umbraco-cms/backoffice/language";
import { UmbDocumentItemRepository as O, UMB_DOCUMENT_PICKER_MODAL as A } from "@umbraco-cms/backoffice/document";
var D = Object.defineProperty, P = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, l = (e, a, t, n) => {
  for (var i = n > 1 ? void 0 : n ? P(a, t) : a, h = e.length - 1, _; h >= 0; h--)
    (_ = e[h]) && (i = (n ? _(a, t, i) : _(i)) || i);
  return n && i && D(a, t, i), i;
}, b = (e, a, t) => a.has(e) || f("Cannot " + t), p = (e, a, t) => (b(e, a, "read from private field"), t ? t.call(e) : a.get(e)), c = (e, a, t) => a.has(e) ? f("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), x = (e, a, t, n) => (b(e, a, "write to private field"), a.set(e, t), t), m = (e, a, t) => (b(e, a, "access private method"), t), g, v, u, s, y, M, C, w;
let o = class extends L {
  constructor() {
    super(), c(this, s), c(this, g, new R(this)), c(this, v, new O(this)), c(this, u), this._languages = [], this.consumeContext(N, (e) => {
      x(this, u, e);
    });
  }
  async connectedCallback() {
    super.connectedCallback();
    const { data: e } = await p(this, g).requestCollection({ skip: 0, take: 100 });
    if (e && e.items.length > 1) {
      this._languages = e.items.map((t) => ({ name: t.name, value: t.unique, selected: !1 }));
      const a = e.items.find((t) => t.isDefault) ?? e.items[0];
      this._culture = a?.unique;
    }
  }
  render() {
    return r`
      <umb-body-layout headline="Login as Member">
        <uui-box>
          <p>
            You are about to login as member
            <strong>${this.data?.memberName ?? ""}</strong>.
          </p>

          ${this._languages.length > 1 ? r`
                <uui-label for="culture">Culture</uui-label>
                <uui-select
                  id="culture"
                  label="Culture"
                  .options=${this._languages}
                  @change=${m(this, s, y)}></uui-select>
              ` : k}

          <uui-label>Redirect page</uui-label>
          ${this._pageName ? r`
                <uui-ref-node name=${this._pageName} standalone>
                  <uui-action-bar slot="actions">
                    <uui-button label="Remove" @click=${m(this, s, C)}>Remove</uui-button>
                  </uui-action-bar>
                </uui-ref-node>
              ` : r`
                <uui-button look="placeholder" label="Add" @click=${m(this, s, M)}>Add</uui-button>
                <small>You will be redirected to the root page '/' of the website.</small>
              `}
        </uui-box>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._rejectModal}>Cancel</uui-button>
          <uui-button
            color="positive"
            look="primary"
            label="Login as Member"
            @click=${m(this, s, w)}>
            Login as Member
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
g = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakSet();
y = function(e) {
  this._culture = e.target.value;
};
M = async function() {
  if (!p(this, u)) return;
  const e = p(this, u).open(this, A, {
    data: { multiple: !1 }
  });
  try {
    const t = (await e.onSubmit())?.selection?.[0];
    if (!t) return;
    this._contentKey = t;
    const { data: n } = await p(this, v).requestItems([t]), i = n?.[0];
    this._pageName = i?.variants?.[0]?.name ?? i?.name ?? "Selected page";
  } catch {
  }
};
C = function() {
  this._contentKey = void 0, this._pageName = void 0;
};
w = function() {
  this.value = { contentKey: this._contentKey, culture: this._culture }, this._submitModal();
};
o.styles = [
  E`
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
l([
  d()
], o.prototype, "_languages", 2);
l([
  d()
], o.prototype, "_culture", 2);
l([
  d()
], o.prototype, "_pageName", 2);
l([
  d()
], o.prototype, "_contentKey", 2);
o = l([
  $("member-login-modal")
], o);
const q = o;
export {
  o as MemberLoginModalElement,
  q as default
};
//# sourceMappingURL=member-login-modal.element.js.map
