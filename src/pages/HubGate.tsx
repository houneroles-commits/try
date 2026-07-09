import { useTranslation } from 'react-i18next';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import Hub from './Hub';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/** Gates the Hub behind Clerk login when configured; otherwise opens it (so the
 *  app still works with no auth key). Personal mode is never gated. */
export default function HubGate() {
  if (!clerkKey) return <Hub />;
  return <ClerkGate />;
}

function ClerkGate() {
  const { t } = useTranslation();
  return (
    <>
      <SignedIn>
        <Hub />
      </SignedIn>
      <SignedOut>
        <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
          <div className="absolute inset-0 glow-radial opacity-40 pointer-events-none" aria-hidden />
          <div className="relative flex flex-col items-center">
            <h1 className="text-3xl font-display font-bold text-ink text-center mb-1">
              {t('hub.title')}
            </h1>
            <p className="text-center text-ink-soft mb-6">{t('hub.signInPrompt')}</p>
            <SignIn
              routing="hash"
              forceRedirectUrl="/hub"
              signUpForceRedirectUrl="/hub"
              appearance={{ variables: { colorPrimary: '#C25A2B' } }}
            />
            <a href="/welcome" className="mt-6 text-sm font-semibold text-clay-strong">
              ← {t('mode.prompt')}
            </a>
          </div>
        </div>
      </SignedOut>
    </>
  );
}
