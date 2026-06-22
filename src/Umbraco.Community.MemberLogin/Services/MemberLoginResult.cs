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
