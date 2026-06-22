namespace Umbraco.Community.MemberLogin.Models;

public class MemberLoginResponseModel
{
    /// <summary>The URL to open in a new tab as the signed-in member.</summary>
    public required string RedirectUrl { get; set; }
}
