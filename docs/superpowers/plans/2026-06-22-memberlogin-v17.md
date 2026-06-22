# MemberLogin V17 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the V8/V13 *MemberLogin* package for Umbraco 17 — a backoffice action that signs the user in to the front-end as a member (with optional culture + redirect page) and opens it in a new tab.

**Architecture:** A single Razor Class Library (RCL), packable to NuGet. The backend exposes one backoffice-authenticated management API endpoint (own Swagger group) that signs a member in via `IMemberSignInManager` and resolves the redirect URL via `IPublishedUrlProvider`. The frontend is a Lit/TypeScript backoffice extension (entity action + modal) that calls the endpoint through a generated OpenAPI client and opens the returned URL in a new window.

**Tech Stack:** .NET 10 / Umbraco.Cms 17.0.x, ASP.NET Core management API, Lit 3 + TypeScript, Vite, `@hey-api/openapi-ts` client, xUnit + NSubstitute for backend tests.

## Global Constraints

- Target framework: `net10.0`.
- Umbraco dependencies pinned to `17.0.x` (floor): `Umbraco.Cms.Api.Management`, `Umbraco.Cms.Api.Common`, `Umbraco.Cms.Web.Common`, `Umbraco.Cms.Web.Website`.
- Root namespace & NuGet id: `Umbraco.Community.MemberLogin`.
- Repo root: `D:\Repos\Umbraco.Community.MemberLogin`. **Package project only** — no test host project in this repo.
- App_Plugins folder name (frontend assets + manifest): `MemberLogin`.
- Swagger group / API name constant: `member-login` (lowercase), exposed at `/umbraco/swagger/member-login/swagger.json`.
- Access gating: backoffice user + Members-section + access-to-sensitive-data (frontend condition `Umb.Condition.CurrentUser.HasAccessToSensitiveData`; backend `[Authorize]` policy).
- Open behaviour: always `window.open(url, '_blank')`.
- Generated OpenAPI client (`Client/src/api/`) **is committed** so the package builds without a live site.
- Never use raw `fetch()` for the API — always the generated client configured with `UMB_AUTH_CONTEXT`.
- Build output of the Vite client goes to `wwwroot/App_Plugins/MemberLogin/` and is shipped as RCL static web assets.

---

### Task 1: Scaffold the RCL project

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Umbraco.Community.MemberLogin.csproj`
- Create: `src/Umbraco.Community.MemberLogin/Constants.cs`
- Create: `.gitignore`
- Create: `README.md`
- Create: `LICENSE` (MIT)

**Interfaces:**
- Produces: `Umbraco.Community.MemberLogin.Constants.ApiName` (`"member-login"`), used by the Swagger composer and controller route.

- [ ] **Step 1: Create the csproj**

```xml
<Project Sdk="Microsoft.NET.Sdk.Razor">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>Umbraco.Community.MemberLogin</RootNamespace>

    <!-- NuGet metadata -->
    <PackageId>Umbraco.Community.MemberLogin</PackageId>
    <Title>Umbraco Member Login</Title>
    <Description>Sign in to the front-end as a member from the Umbraco backoffice, with optional culture and redirect page, opening in a new tab.</Description>
    <Authors>Aaron Sadler</Authors>
    <PackageTags>umbraco umbraco-marketplace member impersonation login</PackageTags>
    <PackageLicenseExpression>MIT</PackageLicenseExpression>
    <PackageReadmeFile>README.md</PackageReadmeFile>
    <Version>1.0.0</Version>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);1591</NoWarn>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Umbraco.Cms.Api.Management" Version="17.0.2" />
    <PackageReference Include="Umbraco.Cms.Api.Common" Version="17.0.2" />
    <PackageReference Include="Umbraco.Cms.Web.Common" Version="17.0.2" />
    <PackageReference Include="Umbraco.Cms.Web.Website" Version="17.0.2" />
  </ItemGroup>

  <ItemGroup>
    <None Include="..\..\README.md" Pack="true" PackagePath="\" />
  </ItemGroup>

  <!-- Keep TS client tooling out of the C# compile/pack -->
  <ItemGroup>
    <Compile Remove="Client\**" />
    <Content Remove="Client\**" />
    <None Remove="Client\**" />
  </ItemGroup>

</Project>
```

- [ ] **Step 2: Create Constants.cs**

```csharp
namespace Umbraco.Community.MemberLogin;

public static class Constants
{
    /// <summary>The Swagger group / API name for the package's management API.</summary>
    public const string ApiName = "member-login";
}
```

- [ ] **Step 3: Create .gitignore**

```gitignore
bin/
obj/
node_modules/
*.user
```

- [ ] **Step 4: Create README.md and LICENSE**

`README.md`:
```markdown
# Umbraco.Community.MemberLogin

Sign in to the front-end **as a member** from the Umbraco 17 backoffice.
Adds a "Login as Member" action to members, lets you pick a culture and a
redirect page, and opens the front-end in a new tab logged in as that member.

## Install

`dotnet add package Umbraco.Community.MemberLogin`

## Usage

In the Members section, open a member's actions menu and choose **Login as
Member**. The action is only visible to backoffice users with access to
sensitive data.
```

`LICENSE`: standard MIT text, copyright Aaron Sadler, 2026.

- [ ] **Step 5: Build to verify the project compiles**

Run: `dotnet build src/Umbraco.Community.MemberLogin/Umbraco.Community.MemberLogin.csproj`
Expected: Build succeeded, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: scaffold MemberLogin RCL project"
```

---

### Task 2: Request/response models

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Models/MemberLoginRequestModel.cs`
- Create: `src/Umbraco.Community.MemberLogin/Models/MemberLoginResponseModel.cs`

**Interfaces:**
- Produces:
  - `MemberLoginRequestModel { Guid MemberKey; Guid? ContentKey; string? Culture; }`
  - `MemberLoginResponseModel { string RedirectUrl; }`

- [ ] **Step 1: Create the request model**

```csharp
namespace Umbraco.Community.MemberLogin.Models;

public class MemberLoginRequestModel
{
    /// <summary>The key of the member to sign in as.</summary>
    public Guid MemberKey { get; set; }

    /// <summary>Optional content node to redirect to after sign-in. Null = site root.</summary>
    public Guid? ContentKey { get; set; }

    /// <summary>Optional culture for the redirect URL (e.g. "en-US"). Null = default.</summary>
    public string? Culture { get; set; }
}
```

- [ ] **Step 2: Create the response model**

```csharp
namespace Umbraco.Community.MemberLogin.Models;

public class MemberLoginResponseModel
{
    /// <summary>The URL to open in a new tab as the signed-in member.</summary>
    public required string RedirectUrl { get; set; }
}
```

- [ ] **Step 3: Build**

Run: `dotnet build src/Umbraco.Community.MemberLogin/Umbraco.Community.MemberLogin.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add MemberLogin request/response models"
```

---

### Task 3: MemberLoginService (testable core) + tests

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Services/IMemberLoginService.cs`
- Create: `src/Umbraco.Community.MemberLogin/Services/MemberLoginService.cs`
- Create: `src/Umbraco.Community.MemberLogin/Services/MemberLoginResult.cs`
- Create: `test/Umbraco.Community.MemberLogin.Tests/Umbraco.Community.MemberLogin.Tests.csproj`
- Test: `test/Umbraco.Community.MemberLogin.Tests/MemberLoginServiceTests.cs`

**Interfaces:**
- Consumes (Umbraco): `IMemberService.GetByKey(Guid)`, `IMemberManager.FindByIdAsync(string)`, `IMemberSignInManager.SignInAsync(MemberIdentityUser, bool)`, `IPublishedUrlProvider.GetUrl(Guid, UrlMode, string?)`.
- Produces:
  - `MemberLoginResult { bool Success; string? RedirectUrl; MemberLoginError Error; }`
  - `enum MemberLoginError { None, MemberNotFound, ContentNotPublished }`
  - `IMemberLoginService.LoginAsync(MemberLoginRequestModel) : Task<MemberLoginResult>`

> **Note for implementer:** the exact member→identity-user lookup API (`IMemberManager.FindByIdAsync` taking the member Id string) should be confirmed against the installed Umbraco 17 assemblies. Tests mock these interfaces, so the structure here is correct regardless; the manual smoke test (Task 11) confirms real sign-in.

- [ ] **Step 1: Create the test project**

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
    <PackageReference Include="NSubstitute" Version="5.1.0" />
    <PackageReference Include="FluentAssertions" Version="6.12.1" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\src\Umbraco.Community.MemberLogin\Umbraco.Community.MemberLogin.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Create the result type**

```csharp
namespace Umbraco.Community.MemberLogin.Services;

public enum MemberLoginError
{
    None,
    MemberNotFound,
    ContentNotPublished,
}

public class MemberLoginResult
{
    public bool Success { get; init; }
    public string? RedirectUrl { get; init; }
    public MemberLoginError Error { get; init; }

    public static MemberLoginResult Ok(string redirectUrl)
        => new() { Success = true, RedirectUrl = redirectUrl, Error = MemberLoginError.None };

    public static MemberLoginResult Fail(MemberLoginError error)
        => new() { Success = false, Error = error };
}
```

- [ ] **Step 3: Create the interface**

```csharp
using Umbraco.Community.MemberLogin.Models;

namespace Umbraco.Community.MemberLogin.Services;

public interface IMemberLoginService
{
    Task<MemberLoginResult> LoginAsync(MemberLoginRequestModel request);
}
```

- [ ] **Step 4: Write the failing tests**

```csharp
using FluentAssertions;
using NSubstitute;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.MemberLogin.Models;
using Umbraco.Community.MemberLogin.Services;
using Xunit;

namespace Umbraco.Community.MemberLogin.Tests;

public class MemberLoginServiceTests
{
    private readonly IMemberService _memberService = Substitute.For<IMemberService>();
    private readonly IMemberManager _memberManager = Substitute.For<IMemberManager>();
    private readonly IMemberSignInManager _signInManager = Substitute.For<IMemberSignInManager>();
    private readonly IPublishedUrlProvider _urlProvider = Substitute.For<IPublishedUrlProvider>();

    private MemberLoginService CreateSut() =>
        new(_memberService, _memberManager, _signInManager, _urlProvider);

    private void GivenMemberExists(Guid key)
    {
        var member = Substitute.For<IMember>();
        member.Key.Returns(key);
        member.Id.Returns(123);
        _memberService.GetByKey(key).Returns(member);
        _memberManager.FindByIdAsync("123").Returns(Substitute.For<MemberIdentityUser>());
    }

    [Fact]
    public async Task Returns_root_when_no_content_key()
    {
        var key = Guid.NewGuid();
        GivenMemberExists(key);

        var result = await CreateSut().LoginAsync(new MemberLoginRequestModel { MemberKey = key });

        result.Success.Should().BeTrue();
        result.RedirectUrl.Should().Be("/");
    }

    [Fact]
    public async Task Returns_resolved_url_for_content_and_culture()
    {
        var key = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        GivenMemberExists(key);
        _urlProvider.GetUrl(contentKey, UrlMode.Absolute, "en-US").Returns("https://site/en/page");

        var result = await CreateSut().LoginAsync(new MemberLoginRequestModel
        {
            MemberKey = key, ContentKey = contentKey, Culture = "en-US",
        });

        result.Success.Should().BeTrue();
        result.RedirectUrl.Should().Be("https://site/en/page");
    }

    [Fact]
    public async Task Fails_when_member_not_found()
    {
        _memberService.GetByKey(Arg.Any<Guid>()).Returns((IMember?)null);

        var result = await CreateSut().LoginAsync(new MemberLoginRequestModel { MemberKey = Guid.NewGuid() });

        result.Success.Should().BeFalse();
        result.Error.Should().Be(MemberLoginError.MemberNotFound);
    }

    [Fact]
    public async Task Fails_when_content_not_published()
    {
        var key = Guid.NewGuid();
        var contentKey = Guid.NewGuid();
        GivenMemberExists(key);
        _urlProvider.GetUrl(contentKey, UrlMode.Absolute, null).Returns("#"); // Umbraco returns "#" for unroutable/unpublished

        var result = await CreateSut().LoginAsync(new MemberLoginRequestModel
        {
            MemberKey = key, ContentKey = contentKey,
        });

        result.Success.Should().BeFalse();
        result.Error.Should().Be(MemberLoginError.ContentNotPublished);
    }
}
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `dotnet test test/Umbraco.Community.MemberLogin.Tests`
Expected: FAIL — `MemberLoginService` does not exist.

- [ ] **Step 6: Implement MemberLoginService**

```csharp
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.MemberLogin.Models;

namespace Umbraco.Community.MemberLogin.Services;

public class MemberLoginService : IMemberLoginService
{
    private readonly IMemberService _memberService;
    private readonly IMemberManager _memberManager;
    private readonly IMemberSignInManager _signInManager;
    private readonly IPublishedUrlProvider _urlProvider;

    public MemberLoginService(
        IMemberService memberService,
        IMemberManager memberManager,
        IMemberSignInManager signInManager,
        IPublishedUrlProvider urlProvider)
    {
        _memberService = memberService;
        _memberManager = memberManager;
        _signInManager = signInManager;
        _urlProvider = urlProvider;
    }

    public async Task<MemberLoginResult> LoginAsync(MemberLoginRequestModel request)
    {
        var member = _memberService.GetByKey(request.MemberKey);
        if (member is null)
        {
            return MemberLoginResult.Fail(MemberLoginError.MemberNotFound);
        }

        // Resolve redirect URL first so we never sign in only to fail on an unpublished target.
        var redirectUrl = "/";
        if (request.ContentKey.HasValue)
        {
            var url = _urlProvider.GetUrl(request.ContentKey.Value, UrlMode.Absolute, request.Culture);
            if (string.IsNullOrEmpty(url) || url == "#")
            {
                return MemberLoginResult.Fail(MemberLoginError.ContentNotPublished);
            }

            redirectUrl = url;
        }

        var identityUser = await _memberManager.FindByIdAsync(member.Id.ToString());
        if (identityUser is null)
        {
            return MemberLoginResult.Fail(MemberLoginError.MemberNotFound);
        }

        await _signInManager.SignInAsync(identityUser, isPersistent: false);

        return MemberLoginResult.Ok(redirectUrl);
    }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `dotnet test test/Umbraco.Community.MemberLogin.Tests`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: add MemberLoginService with tests"
```

---

### Task 4: Swagger/OpenAPI registration (composer) + DI

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Composing/MemberLoginComposer.cs`

**Interfaces:**
- Consumes: `Constants.ApiName`, `IMemberLoginService`/`MemberLoginService`.
- Produces: Swagger doc at `/umbraco/swagger/member-login/swagger.json`; `IMemberLoginService` registered in DI.

- [ ] **Step 1: Create the composer (Swagger group + schema handler + DI)**

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Web.Common.ApplicationBuilder;
using Umbraco.Community.MemberLogin.Services;

namespace Umbraco.Community.MemberLogin.Composing;

public class MemberLoginComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddScoped<IMemberLoginService, MemberLoginService>();

        builder.Services.AddSingleton<ISchemaIdHandler, MemberLoginSchemaIdHandler>();
        builder.Services.AddTransient<IConfigureOptions<SwaggerGenOptions>, MemberLoginSwaggerGenOptions>();
        builder.Services.Configure<UmbracoPipelineOptions>(options =>
        {
            options.AddFilter(new UmbracoPipelineFilter(Constants.ApiName)
            {
                SwaggerPath = $"/umbraco/swagger/{Constants.ApiName}/swagger.json",
                SwaggerRoutePrefix = Constants.ApiName,
            });
        });
    }
}

public class MemberLoginSchemaIdHandler : SchemaIdHandler
{
    public override bool CanHandle(Type type)
        => type.Namespace?.StartsWith("Umbraco.Community.MemberLogin") ?? false;
}

public class MemberLoginSwaggerGenOptions : IConfigureOptions<SwaggerGenOptions>
{
    public void Configure(SwaggerGenOptions options)
        => options.SwaggerDoc(
            Constants.ApiName,
            new OpenApiInfo { Title = "Member Login API", Version = "1.0" });
}
```

- [ ] **Step 2: Build**

Run: `dotnet build src/Umbraco.Community.MemberLogin/Umbraco.Community.MemberLogin.csproj`
Expected: Build succeeded.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: register MemberLogin swagger group and DI"
```

---

### Task 5: Management API controller

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Controllers/MemberLoginControllerBase.cs`
- Create: `src/Umbraco.Community.MemberLogin/Controllers/LoginController.cs`

**Interfaces:**
- Consumes: `IMemberLoginService.LoginAsync`, `MemberLoginRequestModel`, `MemberLoginResponseModel`, `MemberLoginResult`.
- Produces: `POST /umbraco/management/api/v1/member-login/login` → 200 `MemberLoginResponseModel` | 404 | 400 problem-details.

> **Note for implementer:** confirm the base route attribute against Umbraco 17 — the standard is `[VersionedApiBackOfficeRoute("member-login")]` (from `Umbraco.Cms.Api.Management.Routing`) on a base inheriting `ManagementApiControllerBase`. The `[Authorize]` policy constant for Members-section access is `Umbraco.Cms.Web.Common.Authorization.AuthorizationPolicies.SectionAccessMembers`. Verify the sensitive-data requirement constant; if none maps cleanly, the frontend condition remains the visible gate and Members-section access is the backend floor.

- [ ] **Step 1: Create the controller base**

```csharp
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Web.Common.Authorization;

namespace Umbraco.Community.MemberLogin.Controllers;

[ApiController]
[VersionedApiBackOfficeRoute(Constants.ApiName)]
[ApiExplorerSettings(GroupName = Constants.ApiName)]
[Authorize(Policy = AuthorizationPolicies.SectionAccessMembers)]
public abstract class MemberLoginControllerBase : ManagementApiControllerBase
{
}
```

- [ ] **Step 2: Create the LoginController**

```csharp
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Community.MemberLogin.Models;
using Umbraco.Community.MemberLogin.Services;

namespace Umbraco.Community.MemberLogin.Controllers;

[ApiVersion("1.0")]
public class LoginController : MemberLoginControllerBase
{
    private readonly IMemberLoginService _memberLoginService;

    public LoginController(IMemberLoginService memberLoginService)
        => _memberLoginService = memberLoginService;

    [HttpPost("login")]
    [MapToApiVersion("1.0")]
    [ProducesResponseType(typeof(MemberLoginResponseModel), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Login(MemberLoginRequestModel request)
    {
        var result = await _memberLoginService.LoginAsync(request);

        if (result.Success)
        {
            return Ok(new MemberLoginResponseModel { RedirectUrl = result.RedirectUrl! });
        }

        return result.Error switch
        {
            MemberLoginError.MemberNotFound => NotFound(new ProblemDetails
            {
                Title = "Member not found",
                Detail = "No member exists with the supplied key.",
                Status = StatusCodes.Status404NotFound,
            }),
            MemberLoginError.ContentNotPublished => BadRequest(new ProblemDetails
            {
                Title = "Redirect page not published",
                Detail = "The selected redirect page is not published for the chosen culture.",
                Status = StatusCodes.Status400BadRequest,
            }),
            _ => BadRequest(),
        };
    }
}
```

- [ ] **Step 3: Build**

Run: `dotnet build src/Umbraco.Community.MemberLogin/Umbraco.Community.MemberLogin.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add MemberLogin management API controller"
```

---

### Task 6: Client tooling (Vite + TS + generation script)

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Client/package.json`
- Create: `src/Umbraco.Community.MemberLogin/Client/tsconfig.json`
- Create: `src/Umbraco.Community.MemberLogin/Client/vite.config.ts`
- Create: `src/Umbraco.Community.MemberLogin/Client/scripts/generate-openapi.js`
- Create: `src/Umbraco.Community.MemberLogin/Client/.gitignore`

**Interfaces:**
- Produces: `npm run build` → emits to `../wwwroot/App_Plugins/MemberLogin`; `npm run generate-client <swaggerUrl>` → writes `src/api/`.

- [ ] **Step 1: package.json**

```json
{
  "name": "umbraco-community-memberlogin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "watch": "vite build --watch",
    "generate-client": "node scripts/generate-openapi.js https://localhost:44339/umbraco/swagger/member-login/swagger.json"
  },
  "dependencies": {
    "@umbraco-cms/backoffice": "^17.0.0"
  },
  "devDependencies": {
    "@hey-api/client-fetch": "^0.10.0",
    "@hey-api/openapi-ts": "^0.66.7",
    "chalk": "^5.4.1",
    "node-fetch": "^3.3.2",
    "typescript": "^5.9.0",
    "vite": "^7.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "experimentalDecorators": false,
    "useDefineForClassFields": false,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: vite.config.ts**

```ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "member-login",
    },
    outDir: "../wwwroot/App_Plugins/MemberLogin",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^@umbraco-cms\//],
    },
  },
});
```

- [ ] **Step 4: scripts/generate-openapi.js**

```javascript
import fetch from "node-fetch";
import chalk from "chalk";
import { createClient, defaultPlugins } from "@hey-api/openapi-ts";

const swaggerUrl = process.argv[2];
if (!swaggerUrl) {
  console.error(chalk.red("ERROR: Missing URL to OpenAPI spec"));
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
console.log(`Fetching OpenAPI definition from ${chalk.yellow(swaggerUrl)}`);

fetch(swaggerUrl)
  .then(async (response) => {
    if (!response.ok) {
      console.error(chalk.red(`ERROR: ${response.status} ${response.statusText}`));
      return;
    }
    await createClient({
      input: swaggerUrl,
      output: "src/api",
      plugins: [
        ...defaultPlugins,
        { name: "@hey-api/client-fetch", bundle: true, exportFromIndex: true, throwOnError: true },
        { name: "@hey-api/typescript", enums: "typescript" },
        { name: "@hey-api/sdk", asClass: true },
      ],
    });
    console.log(chalk.green("Client generated successfully!"));
  })
  .catch((error) => console.error(`ERROR: ${chalk.red(error.message)}`));
```

- [ ] **Step 5: Client/.gitignore**

```gitignore
node_modules/
```
(Note: `src/api/` is intentionally NOT ignored — the generated client is committed.)

- [ ] **Step 6: Install deps**

Run: `cd src/Umbraco.Community.MemberLogin/Client && npm install`
Expected: dependencies installed, `node_modules/` present.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: add MemberLogin client build + generation tooling"
```

---

### Task 7: Generate the OpenAPI client

**Files:**
- Create (generated, committed): `src/Umbraco.Community.MemberLogin/Client/src/api/**`

**Interfaces:**
- Produces: generated `client` (from `api/client.gen`) and a service class (e.g. `LoginService` / `MemberLoginService`) with a `login({ body })` method and `MemberLoginRequestModel`/`MemberLoginResponseModel` types. **Confirm the exact generated names** after generation and use them in Tasks 8–9.

> This task requires a running Umbraco 17 host that has the package referenced and is serving `/umbraco/swagger/member-login/swagger.json`. Since this repo is package-only, temporarily reference the project from any Umbraco 17 site (e.g. add a `ProjectReference` to `Umbraco.Community.MemberLogin.csproj`), run it, generate, then remove the temporary reference.

- [ ] **Step 1: Start a host with the package referenced**

Run the host site (HTTPS). Confirm `https://<host>/umbraco/swagger/member-login/swagger.json` returns JSON containing the `login` operation.

- [ ] **Step 2: Generate**

Run: `cd src/Umbraco.Community.MemberLogin/Client && npm run generate-client -- https://<host>/umbraco/swagger/member-login/swagger.json`
(Adjust the URL to your host port.)
Expected: "Client generated successfully!" and files under `src/api/`.

- [ ] **Step 3: Inspect generated names**

Open `src/api/sdk.gen.ts` and note the exact service class + method names and the request/response type names. Record them for Tasks 8–9.

- [ ] **Step 4: Commit**

```bash
git add src/Umbraco.Community.MemberLogin/Client/src/api
git commit -m "feat: generate MemberLogin OpenAPI client"
```

---

### Task 8: Entry point + manifests + umbraco-package.json

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Client/src/index.ts`
- Create: `src/Umbraco.Community.MemberLogin/Client/src/entrypoint.ts`
- Create: `src/Umbraco.Community.MemberLogin/Client/src/manifests.ts`
- Create: `src/Umbraco.Community.MemberLogin/wwwroot/App_Plugins/MemberLogin/umbraco-package.json`

**Interfaces:**
- Consumes: generated `client` from Task 7; `UMB_AUTH_CONTEXT`.
- Produces: `manifests` array (entrypoint + entity action + modal) exported and registered via `index.ts`.

- [ ] **Step 1: entrypoint.ts (configure generated client with auth)**

```ts
import type { UmbEntryPointOnInit } from "@umbraco-cms/backoffice/extension-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { client } from "./api/client.gen.js";

export const onInit: UmbEntryPointOnInit = (host) => {
  host.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
    if (!authContext) return;
    const config = authContext.getOpenApiConfiguration();
    client.setConfig({
      baseUrl: config.base,
      credentials: config.credentials,
      auth: config.token,
    });
  });
};
```

- [ ] **Step 2: manifests.ts**

```ts
import type { ManifestTypes } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_MEMBER_ENTITY_TYPE } from "@umbraco-cms/backoffice/member";

const entrypoint: ManifestTypes = {
  type: "backofficeEntryPoint",
  alias: "MemberLogin.Entrypoint",
  name: "Member Login Entrypoint",
  js: () => import("./entrypoint.js"),
};

const entityAction: ManifestTypes = {
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
    { alias: "Umb.Condition.CurrentUser.HasAccessToSensitiveData" },
  ],
};

const modal: ManifestTypes = {
  type: "modal",
  alias: "MemberLogin.Modal",
  name: "Member Login Modal",
  js: () => import("./member-login-modal.element.js"),
};

export const manifests: Array<ManifestTypes> = [entrypoint, entityAction, modal];
```

> **Note:** if `ManifestTypes` import path differs in your installed version, use `UmbExtensionManifest`. The label `#memberLogin_action` resolves from a localization manifest (Task 10) — or inline the string `"Login as Member"` if you skip localization.

- [ ] **Step 3: index.ts**

```ts
export * from "./manifests.js";
```

- [ ] **Step 4: umbraco-package.json**

```json
{
  "$schema": "../../umbraco-package-schema.json",
  "id": "Umbraco.Community.MemberLogin",
  "name": "Member Login",
  "version": "1.0.0",
  "allowTelemetry": true,
  "extensions": [
    {
      "name": "Member Login Bundle",
      "alias": "MemberLogin.Bundle",
      "type": "bundle",
      "js": "/App_Plugins/MemberLogin/member-login.js"
    }
  ]
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add MemberLogin entrypoint, manifests, package descriptor"
```

---

### Task 9: Modal element + token

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Client/src/member-login-modal.token.ts`
- Create: `src/Umbraco.Community.MemberLogin/Client/src/member-login-modal.element.ts`

**Interfaces:**
- Produces:
  - `MEMBER_LOGIN_MODAL` token (`UmbModalToken<MemberLoginModalData, MemberLoginModalValue>`)
  - `MemberLoginModalData { memberName: string }`
  - `MemberLoginModalValue { contentKey?: string; culture?: string }`
- Consumes (in Task 9 element): `UmbLanguageCollectionRepository` (from `@umbraco-cms/backoffice/language`), `UMB_DOCUMENT_PICKER_MODAL` (from `@umbraco-cms/backoffice/document`), `UMB_MODAL_MANAGER_CONTEXT`.

> **Note:** confirm `UmbLanguageCollectionRepository` and `UMB_DOCUMENT_PICKER_MODAL` import paths/shape against the installed `@umbraco-cms/backoffice` (use the `umbraco-modals` / `umbraco-collection` backoffice skills if unsure). The language repo's `requestCollection()` returns `{ data: { items, total } }` where each item has `unique`, `name`, `isoCode`.

- [ ] **Step 1: Modal token**

```ts
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
```

- [ ] **Step 2: Modal element**

```ts
import { html, customElement, state, css } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UmbLanguageCollectionRepository } from "@umbraco-cms/backoffice/language";
import { UMB_DOCUMENT_PICKER_MODAL } from "@umbraco-cms/backoffice/document";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { MemberLoginModalData, MemberLoginModalValue } from "./member-login-modal.token.js";

interface LanguageOption { name: string; value: string; selected: boolean; }

@customElement("member-login-modal")
export class MemberLoginModalElement extends UmbModalBaseElement<MemberLoginModalData, MemberLoginModalValue> {
  #languageRepository = new UmbLanguageCollectionRepository(this);
  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  @state() private _languages: LanguageOption[] = [];
  @state() private _culture?: string;
  @state() private _pageName?: string;
  @state() private _contentKey?: string;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => (this.#modalManager = ctx));
  }

  async connectedCallback() {
    super.connectedCallback();
    const { data } = await this.#languageRepository.requestCollection({});
    if (data && data.items.length > 1) {
      this._languages = data.items.map((l) => ({ name: l.name, value: l.isoCode, selected: false }));
      this._culture = this._languages[0]?.value;
    }
  }

  #pickPage() {
    const ctx = this.#modalManager;
    if (!ctx) return;
    const modal = ctx.open(this, UMB_DOCUMENT_PICKER_MODAL, { data: { multiple: false } });
    modal?.onSubmit().then((value) => {
      const selected = value?.selection?.[0];
      if (selected) {
        this._contentKey = selected;
        // The picker returns the unique id; show a generic label until resolved server-side.
        this._pageName = "Selected page";
      }
    }).catch(() => {});
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
      <umb-body-layout headline="Login as Member">
        <uui-box>
          <p>You are about to login as member <strong>${this.data?.memberName}</strong>.</p>

          ${this._languages.length > 1
            ? html`
                <uui-label>Culture</uui-label>
                <uui-select
                  .options=${this._languages}
                  @change=${(e: any) => (this._culture = e.target.value)}></uui-select>`
            : ""}

          <uui-label>Redirect page</uui-label>
          ${this._pageName
            ? html`<uui-ref-node name=${this._pageName}>
                <uui-action-bar slot="actions">
                  <uui-button label="Remove" @click=${this.#removePage}>Remove</uui-button>
                </uui-action-bar>
              </uui-ref-node>`
            : html`<uui-button look="placeholder" label="Add" @click=${this.#pickPage}>Add</uui-button>
                <small>You will be redirected to the root page '/' of the website.</small>`}
        </uui-box>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._rejectModal}>Cancel</uui-button>
          <uui-button color="positive" look="primary" label="Login as Member" @click=${this.#submit}>
            Login as Member
          </uui-button>
        </div>
      </umb-body-layout>`;
  }

  static styles = [css`
    uui-label { display: block; margin-top: var(--uui-size-space-4); }
    small { display: block; color: var(--uui-color-text-alt); margin-top: var(--uui-size-space-2); }
  `];
}

export default MemberLoginModalElement;
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add MemberLogin modal element and token"
```

---

### Task 10: Entity action (open modal → call API → open new window)

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Client/src/member-login.entity-action.ts`

**Interfaces:**
- Consumes: `UMB_MODAL_MANAGER_CONTEXT`, `MEMBER_LOGIN_MODAL`, generated login service/method from Task 7, the member's name + key (from the entity action args / member item repository).

> **Note:** the entity action receives `this.args.unique` (member key) and `this.args.entityType`. Fetch the member name via the member item repository (`UmbMemberItemRepository` from `@umbraco-cms/backoffice/member`) or pass `unique` as the name fallback. Use the exact generated service/method name recorded in Task 7 (shown below as `MemberLoginService.login`).

- [ ] **Step 1: Entity action**

```ts
import { UmbEntityActionBase } from "@umbraco-cms/backoffice/entity-action";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UmbMemberItemRepository } from "@umbraco-cms/backoffice/member";
import { MEMBER_LOGIN_MODAL } from "./member-login-modal.token.js";
// Adjust to the exact generated names from Task 7:
import { MemberLoginService } from "./api/index.js";

export class MemberLoginEntityAction extends UmbEntityActionBase<never> {
  async execute() {
    const unique = this.args.unique;
    if (!unique) return;

    // Resolve member name for the modal headline.
    const itemRepo = new UmbMemberItemRepository(this);
    const { data } = await itemRepo.requestItems([unique]);
    const memberName = data?.[0]?.name ?? "member";

    // Popup-blocker safe: open the window synchronously on the user gesture.
    const win = window.open("", "_blank");

    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    const modal = modalManager.open(this, MEMBER_LOGIN_MODAL, { data: { memberName } });

    try {
      const value = await modal.onSubmit();

      const { data: result } = await MemberLoginService.login({
        body: { memberKey: unique, contentKey: value.contentKey, culture: value.culture },
      });

      if (result?.redirectUrl && win) {
        win.location.href = result.redirectUrl;
      } else {
        win?.close();
      }
    } catch {
      // modal rejected or API error
      win?.close();
    }
  }
}

export default MemberLoginEntityAction;
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add MemberLogin entity action with new-window open"
```

---

### Task 11: Localization + build + static-asset packaging

**Files:**
- Create: `src/Umbraco.Community.MemberLogin/Client/src/lang/en.ts`
- Modify: `src/Umbraco.Community.MemberLogin/Client/src/manifests.ts` (register localization)
- Verify: `src/Umbraco.Community.MemberLogin/Umbraco.Community.MemberLogin.csproj` ships `wwwroot/**` as static web assets (Razor SDK does this automatically; confirm).

**Interfaces:**
- Produces: `#memberLogin_action` etc. resolvable; final built JS in `wwwroot/App_Plugins/MemberLogin/`.

- [ ] **Step 1: Localization file**

```ts
export default {
  memberLogin: {
    action: "Login as Member",
  },
};
```

- [ ] **Step 2: Register localization manifest (append in manifests.ts)**

```ts
const englishLang = {
  type: "localization",
  alias: "MemberLogin.Lang.EnGb",
  name: "English (UK)",
  meta: { culture: "en-gb" },
  js: () => import("./lang/en.js"),
};
// add englishLang to the exported manifests array
```

- [ ] **Step 3: Build the client**

Run: `cd src/Umbraco.Community.MemberLogin/Client && npm run build`
Expected: output files in `../wwwroot/App_Plugins/MemberLogin/` including `member-login.js`.

- [ ] **Step 4: Build + pack the package**

Run: `dotnet pack src/Umbraco.Community.MemberLogin/Umbraco.Community.MemberLogin.csproj -c Release`
Expected: `.nupkg` produced; verify with `unzip -l` that `staticwebassets`/`App_Plugins/MemberLogin/member-login.js` is included.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add localization, build client, verify packaging"
```

---

### Task 12: Manual smoke test + README usage

**Files:**
- Modify: `README.md` (add dev/test + smoke-test instructions)

**Interfaces:** none (verification task).

- [ ] **Step 1: Reference the package into an Umbraco 17 test host**

Add a `ProjectReference` to `Umbraco.Community.MemberLogin.csproj` (or install the packed `.nupkg`) in a test site. Run the site.

- [ ] **Step 2: Smoke test the happy path**

- Log in as a backoffice user **with access to sensitive data**.
- Members section → a member → actions → **Login as Member** is visible.
- Open it: confirm headline shows the member name; culture picker appears only if >1 language; pick a published page (or none).
- Submit: a **new tab** opens at the page/root, authenticated as that member; the backoffice tab is unchanged.

- [ ] **Step 3: Smoke test gating + errors**

- A backoffice user **without** sensitive-data access does NOT see the action.
- Selecting an unpublished page → submit → notification shown, no tab opened.

- [ ] **Step 4: Document results + commit**

```bash
git add README.md
git commit -m "docs: add MemberLogin dev and smoke-test instructions"
```

---

## Self-Review

**Spec coverage:**
- Entity action (member, sensitive-data) → Task 8 (manifest) + Task 10 (behaviour). ✓
- Modal with confirm + culture picker + redirect-page picker → Task 9. ✓
- Culture picker only when >1 language → Task 9 Step 2. ✓
- Server-side member sign-in (`IMemberSignInManager`) + URL resolution (`IPublishedUrlProvider`) → Task 3. ✓
- Backoffice management API in own Swagger group → Tasks 4–5. ✓
- Generated OpenAPI client, committed → Tasks 6–7. ✓
- New-window open + popup-blocker safety → Task 10. ✓
- Error handling (missing member / unpublished) → Task 3 (logic) + Task 5 (problem-details) + Task 12 (smoke). ✓
- Backend unit tests → Task 3. ✓
- Package-only, net10.0, Umbraco 17 deps, App_Plugins/MemberLogin → Tasks 1, 11; Global Constraints. ✓

**Placeholder scan:** No "TBD/TODO". The three "Note for implementer" callouts are API-confirmation guidance (exact Umbraco 17 import paths / member-identity lookup), not missing logic — complete code is provided for each; they flag where to verify against installed assemblies. The one genuinely deferred value is the exact generated service/method name (Task 7 Step 3 records it; Task 10 uses `MemberLoginService.login` as the expected name).

**Type consistency:** `MemberLoginRequestModel` (MemberKey/ContentKey/Culture), `MemberLoginResponseModel` (RedirectUrl), `MemberLoginResult` (Success/RedirectUrl/Error), `MemberLoginError` enum, `IMemberLoginService.LoginAsync`, modal data `{ memberName }` / value `{ contentKey?, culture? }`, token `MEMBER_LOGIN_MODAL` — used consistently across Tasks 2–10.
