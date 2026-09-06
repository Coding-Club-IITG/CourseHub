import "dotenv/config";

const settings = {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID,
    graphUserScopes: ["user.read", "offline_access", "files.readwrite"],
};

export default settings;
