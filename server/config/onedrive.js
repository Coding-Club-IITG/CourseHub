import "dotenv/config";

const settings = {
	clientId: process.env.AZURE_CLIENT_ID,
	clientSecret: process.env.AZURE_CLIENT_SECRET,
	tenantId: process.env.AZURE_TENANT_ID,
	graphUserScopes: ["user.read", "offline_access", "files.readwrite"],
	deviceCode:
		"SAQABAAEAAAD--DLA3VO7QrddgJg7Wevr6R9UNieARbXNbxpjRHHFYzYnODG09H2jUAHrNh9vM7aFU0BKDxATcJryvjwRyIbUkDJaVTjdm_dfMuWDuiaZOvJXUOIEDJFtR7H8DjFFb1wwTtvNnSPoFu8__SmuusSRKpR2vaRVYHnjHa99ULGmlRqh869JZxSYu3YloCNgUKcgAA",
};

export default settings;
