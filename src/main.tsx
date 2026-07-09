import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { registerSW } from 'virtual:pwa-register';
import './i18n';
import './theme.css';
import App from './App';
import { AppProvider } from './state/AppContext';
import { ClerkCloudProvider, NoCloudProvider } from './lib/cloud';

// PWA: auto-update service worker keeps shell + last data available offline
registerSW({ immediate: true });

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Only initialize Clerk when a key is configured — the app still runs (and stays
// offline-capable for personal farmers) without it.
ReactDOM.createRoot(document.getElementById('root')!).render(
  clerkKey ? (
    <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/welcome">
      <ClerkCloudProvider>{tree}</ClerkCloudProvider>
    </ClerkProvider>
  ) : (
    <NoCloudProvider>{tree}</NoCloudProvider>
  ),
);
