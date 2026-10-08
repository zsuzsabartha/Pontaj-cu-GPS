import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./authConfig";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().then((response) => {
    if (response && response.account) {
      msalInstance.setActiveAccount(response.account);
    }
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>
    );
  }).catch(e => {
    console.error("MSAL Redirect Error:", e);
    // Render anyway so the user sees an error state
    root.render(
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    );
  });
});