import { createClient, defaultPlugins } from "@hey-api/openapi-ts";

const swaggerUrl = process.argv[2];
if (!swaggerUrl) {
  console.error("ERROR: Missing URL to OpenAPI spec");
  console.error("Usage: npm run generate-client -- https://<host>/umbraco/swagger/member-login/swagger.json");
  process.exit(1);
}

// Ignore self-signed certificates on localhost.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
console.log(`Generating OpenAPI client from ${swaggerUrl}`);

try {
  await createClient({
    input: swaggerUrl,
    output: "src/api",
    plugins: [
      ...defaultPlugins,
      { name: "@hey-api/client-fetch", bundle: true },
      { name: "@hey-api/typescript", enums: "typescript" },
      { name: "@hey-api/sdk", asClass: true },
    ],
  });
  console.log("Client generated successfully!");
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
