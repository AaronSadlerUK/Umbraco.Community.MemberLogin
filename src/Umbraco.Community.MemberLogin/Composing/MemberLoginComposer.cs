using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Community.MemberLogin.Services;

namespace Umbraco.Community.MemberLogin.Composing;

public class MemberLoginComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddScoped<IMemberLoginService, MemberLoginService>();

        builder.Services.AddSingleton<ISchemaIdHandler, MemberLoginSchemaIdHandler>();
        builder.Services.AddTransient<IConfigureOptions<SwaggerGenOptions>, MemberLoginSwaggerGenOptions>();
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
