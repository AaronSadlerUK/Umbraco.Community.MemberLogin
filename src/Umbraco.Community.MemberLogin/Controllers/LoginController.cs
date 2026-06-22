using Asp.Versioning;
using Microsoft.AspNetCore.Http;
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
