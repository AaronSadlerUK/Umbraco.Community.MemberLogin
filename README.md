# Umbraco.Community.MemberLogin

Sign in to the front-end **as a member** from the Umbraco 17 backoffice.
Adds a "Login as Member" action to members, lets you pick a culture and a
redirect page, and opens the front-end in a new tab logged in as that member.

## Install

```
dotnet add package Umbraco.Community.MemberLogin
```

## Usage

In the Members section, open a member's actions menu and choose **Login as
Member**. The action is only visible to backoffice users with access to
sensitive data.

Optionally pick a culture (shown when the site has more than one language) and a
published redirect page. On confirm, a new browser tab opens at that page (or the
site root) authenticated as the member. Your backoffice tab is left untouched.

## How it works

- A backoffice-authenticated management API endpoint signs the member in using
  `IMemberSignInManager` and resolves the redirect URL with
  `IPublishedUrlProvider`.
- The backoffice extension (entity action + modal) calls that endpoint through a
  generated OpenAPI client and opens the returned URL with
  `window.open(url, '_blank')`.

## Development

Frontend lives in `src/Umbraco.Community.MemberLogin/Client` (Vite + TypeScript).

```
cd src/Umbraco.Community.MemberLogin/Client
npm install
npm run build          # emits to ../wwwroot/App_Plugins/MemberLogin
```

Regenerate the OpenAPI client against a running host that references the package:

```
npm run generate-client -- https://<host>/umbraco/swagger/member-login/swagger.json
```

## License

MIT
