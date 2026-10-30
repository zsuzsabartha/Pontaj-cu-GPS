import { Configuration, PublicClientApplication } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "YOUR_CLIENT_ID_HERE",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "common"}`,
    redirectUri: "/pontaj/",
  },
  cache: {
    cacheLocation: "sessionStorage",
    // storeAuthStateInCookie was removed in MSAL v5 (no longer needed)
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);
