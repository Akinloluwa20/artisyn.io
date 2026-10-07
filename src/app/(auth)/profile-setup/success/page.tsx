'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthProvider';
import { useWallet } from '@/context/WalletProvider';
import { useOnboarding } from '@/components/artisan/onboarding-context';
import { OnboardingSuccess } from '@/components/artisan/onboarding-success';
import { loginWithWallet } from '@/lib/auth/client';
import { dashboardRouteForRole } from '@/lib/navigation';

export default function OnboardingSuccessStep() {
  const router = useRouter();
  const { accountType, isHydrated } = useOnboarding();
  // Role comes from the server session — the onboarding blob is only a hint and
  // never grants access by itself.
  const { role, authenticated, loading } = useAuth();
  const { connected, publicKey } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (accountType == null) {
      router.replace('/profile-setup/account-type');
    }
  }, [accountType, isHydrated, router]);

  const handleContinue = async () => {
    if (submitting) return;
    // Returning users can land here with onboarding storage but no valid
    // session (e.g. cookie expired). Complete the wallet-session exchange
    // before entering any dashboard — storage alone never authenticates.
    if (!authenticated) {
      if (!connected || !publicKey || !accountType) {
        router.replace('/connect-wallet');
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await loginWithWallet(publicKey, accountType);
        // On success, `role` re-renders from the server session; fall back to
        // the hint only as a destination (guards still enforce the real role).
        router.push(dashboardRouteForRole(accountType));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not restore your session.',
        );
        setSubmitting(false);
      }
      return;
    }
    router.push(dashboardRouteForRole(role ?? accountType));
  };

  if (!isHydrated || loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-[#6366F1]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[520px]">
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      <OnboardingSuccess accountType={accountType} onContinue={handleContinue} />
    </div>
  );
}
