using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Web.Common.Authorization;

namespace Umbraco.Community.MemberLogin.Controllers;

[ApiController]
[VersionedApiBackOfficeRoute(Constants.ApiName)]
[MapToApi(Constants.ApiName)]
[Authorize(Policy = AuthorizationPolicies.SectionAccessMembers)]
public abstract class MemberLoginControllerBase : ManagementApiControllerBase
{
}
