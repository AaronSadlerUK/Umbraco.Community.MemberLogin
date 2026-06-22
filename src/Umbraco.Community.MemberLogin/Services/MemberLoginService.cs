using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Security;
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

        // Resolve the redirect URL first so we never sign a member in only to fail
        // afterwards on an unpublished target.
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
