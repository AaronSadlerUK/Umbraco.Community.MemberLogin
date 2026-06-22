using FluentAssertions;
using NSubstitute;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Security;
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
        _memberManager.FindByIdAsync("123")
            .Returns(Task.FromResult<MemberIdentityUser?>(new MemberIdentityUser()));
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
        // Umbraco returns "#" for unroutable/unpublished content.
        _urlProvider.GetUrl(contentKey, UrlMode.Absolute, null).Returns("#");

        var result = await CreateSut().LoginAsync(new MemberLoginRequestModel
        {
            MemberKey = key, ContentKey = contentKey,
        });

        result.Success.Should().BeFalse();
        result.Error.Should().Be(MemberLoginError.ContentNotPublished);
    }
}
