using Umbraco.Community.MemberLogin.Models;

namespace Umbraco.Community.MemberLogin.Services;

public interface IMemberLoginService
{
    Task<MemberLoginResult> LoginAsync(MemberLoginRequestModel request);
}
