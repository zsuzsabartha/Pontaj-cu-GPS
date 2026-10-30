import { Configuration, PublicClientApplication } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "f8b3f745-453b-4b44-90fb-5b4fd4823986",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "bioeel.onmicrosoft.com"}`,
    redirectUri: typeof window !== "undefined" ? `${window.location.origin}/pontaj/` : "/pontaj/",
  },
  cache: {
    cacheLocation: "localStorage",
    // storeAuthStateInCookie was removed in MSAL v5 (no longer needed)
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);
