# Umbraco.Community.MemberLogin — V17 design

**Date:** 2026-06-22
**Status:** Approved (pending spec review)
**Target:** Umbraco 17 (`net10.0`), new Lit/TypeScript backoffice

## Purpose

Recreate the V8/V13 *MemberLogin* package for Umbraco 17. The package lets a
backoffice user sign in to the front-end **as a member** ("impersonate"), choosing
an optional culture and redirect page, and opens the result in a new browser tab.

This is a feature-parity port of the original AngularJS package to the V17
Lit/TypeScript backoffice plus the V17 management API and ASP.NET Core member
sign-in.

## Feature parity (from V13)

The V17 package reproduces all original behaviour:

1. **"Login as Member" entity action** on member entities.
2. **Modal dialog** showing `You are about to login as member {name}.`
3. **Culture/language picker** — shown only when the site has more than one
   language. Chooses the culture of the redirect page.
4. **Redirect-page picker** — pick a published content node; defaults to `/` when
   none is chosen. The culture-specific published URL is resolved and used.
5. **Open in a new window** — `window.open(url, '_blank')`, keeping the backoffice
   tab open.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Repo contents | **Package project only** (releasable RCL). User wires it into their own test host. |
| Feature scope | **Full parity** (confirm + culture picker + redirect-page picker + new window). |
| Access gating | **Sensitive-data access** — only backoffice users with access to sensitive data see/use the action. |
| Open behaviour | **Always new window** (`_blank`). |
| Frontend client | **Generated OpenAPI client** (Umbraco backoffice generator via `@hey-api/openapi-ts`). |
| URL resolution | **Server-side** via `IPublishedUrlProvider` (robust; also enforces the published check). |

## Architecture

### Project structure

A single Razor Class Library, packable to NuGet, rooted at
`D:\Repos\Umbraco.Community.MemberLogin`:

```
Umbraco.Community.MemberLogin/
├─ src/Umbraco.Community.MemberLogin/
│  ├─ Umbraco.Community.MemberLogin.csproj   # net10.0, RCL, packs static web assets
│  ├─ Controllers/MemberLoginControllerBase.cs   # versioned mgmt-API base + swagger group
│  ├─ Controllers/LoginController.cs             # POST login endpoint
│  ├─ Models/MemberLoginRequestModel.cs
│  ├─ Models/MemberLoginResponseModel.cs
│  ├─ Composing/MemberLoginComposer.cs           # swagger doc + DI
│  ├─ Client/                                     # TS source (Vite)
│  │  ├─ package.json, vite.config.ts, tsconfig.json
│  │  ├─ openapi-ts.config.ts                     # client generation config
│  │  └─ src/
│  │     ├─ api/                                  # GENERATED OpenAPI client (committed)
│  │     ├─ entrypoint.ts                         # sets client base/auth from UMB_AUTH_CONTEXT
│  │     ├─ manifests.ts                          # entity action + modal registration
│  │     ├─ member-login.entity-action.ts
│  │     ├─ member-login-modal.element.ts
│  │     └─ member-login-modal.token.ts
│  └─ wwwroot/App_Plugins/MemberLogin/            # build output + umbraco-package.json
├─ docs/superpowers/specs/2026-06-22-memberlogin-v17-design.md
├─ README.md
├─ LICENSE
└─ .gitignore
```

NuGet dependencies (match host, 17.0.x): `Umbraco.Cms.Api.Management`,
`Umbraco.Cms.Api.Common`, `Umbraco.Cms.Web.Common`, `Umbraco.Cms.Web.Website`.

### Backend (management API)

- A **versioned backoffice management API controller** in its own Swagger group
  `member-login`, so the OpenAPI client can be generated from
  `/umbraco/swagger/member-login/swagger.json`.
- **Endpoint:** `POST /umbraco/management/api/v1/member-login/login`
  - Request: `{ memberKey: Guid, contentKey?: Guid, culture?: string }`
  - Response: `{ redirectUrl: string }`
- **Authorization:** backoffice authentication + Members-section access + access to
  sensitive data (mirrors the frontend gating; exact policy constant finalised in
  the plan).
- **Behaviour:**
  1. Resolve member by `memberKey` via `IMemberService` / `IMemberManager`; 404
     problem-details if missing.
  2. Sign the member in with `IMemberSignInManager.SignInAsync(member, isPersistent: false)`,
     issuing the member auth cookie on the response.
  3. If `contentKey` provided: `IPublishedUrlProvider.GetUrl(contentKey, culture)`;
     verify the target is published (error problem-details if not). Otherwise the
     redirect URL is `/`.
  4. Return `{ redirectUrl }`.

Member auth and backoffice-user auth use separate cookie schemes, so impersonation
does not disturb the backoffice session.

### Frontend (Lit/TypeScript backoffice)

- **Entrypoint** (`backofficeEntryPoint`): consume `UMB_AUTH_CONTEXT`, configure the
  generated client's `baseUrl`/`auth`/`credentials` (same pattern as
  Umbraco.Community.MemberImpersonation).
- **Entity action** registered for the **member** entity type, with conditions:
  - `Umb.Condition.SectionAlias` = `Umb.Section.Members`
  - `Umb.Condition.CurrentUser.HasAccessToSensitiveData`
  - `execute()` opens the modal via the modal manager.
- **Modal** (`UmbModalBaseElement`):
  - Headline + `You are about to login as member {name}.`
  - **Culture picker** (`uui-select`): populated from the language collection
    (management API `/language`); rendered only when `languages.length > 1`.
  - **Redirect-page picker:** opens the core **document picker** modal; on select,
    shows the node name (with remove). Shows the "defaults to `/`" hint when empty.
  - Footer: **Cancel** / **Login as Member**.
  - On submit returns `{ contentKey?, culture? }` to the entity action.

### Data flow

```
Backoffice user → "Login as Member" action → modal
  → (optional) pick culture + redirect page
  → submit → POST /member-login/login { memberKey, contentKey?, culture? }
      → backend: sign member in (member cookie) + resolve published URL
      → { redirectUrl }
  → window.open(redirectUrl, '_blank')   // new tab is the member; backoffice tab untouched
```

## Error handling

- **Missing member / unpublished target:** backend returns problem-details; the
  modal surfaces an `UmbNotification` and stays open. No window is opened.
- **Popup blockers:** the new window is opened **synchronously** on the click
  (`const win = window.open('', '_blank')`), then `win.location.href` is set after
  the POST resolves; `win?.close()` on failure. (Avoids the post-`await` gesture
  loss that blocks `window.open`.)
- **No language variation:** culture picker hidden; `culture` omitted from request.

## Testing

- **Backend unit tests** (xUnit + NSubstitute, matching Umbraco package
  conventions):
  - signs in and returns `/` when no content key supplied;
  - resolves the culture-specific URL when content key + culture supplied;
  - 404 when member not found;
  - error when target content is not published.
- **Manual smoke test** in an Umbraco 17 host (user-supplied test site): action
  visible only with sensitive-data access; impersonation opens a new tab logged in
  as the member.

## Build & client generation

- `Client/` builds with Vite to `wwwroot/App_Plugins/MemberLogin/`, shipped as RCL
  static web assets in the NuGet package.
- The OpenAPI client is generated with `@hey-api/openapi-ts` against a running host
  exposing `/umbraco/swagger/member-login/swagger.json`. **The generated client is
  committed** so the package builds without a live site; regeneration is a documented
  dev step (`npm run generate-client`).

## Out of scope

- No test host project in this repo (package-only by decision).
- No "stop impersonation" backoffice UI (front-end member logout already ends the
  session); can be added later if desired.
- No same-tab/configurable open mode (always new window by decision).
