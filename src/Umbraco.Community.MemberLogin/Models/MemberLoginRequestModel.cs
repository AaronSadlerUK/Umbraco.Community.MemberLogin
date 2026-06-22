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
