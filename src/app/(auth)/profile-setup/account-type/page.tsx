'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useOnboarding } from '@/components/artisan/onboarding-context';
import { AccountTypeSelection } from '@/components/artisan/account-type-selection';
import { useWallet } from '@/context/WalletProvider';
import { loginWithWallet } from '@/lib/auth/client';

export default function AccountTypeStep() {
  const router = useRouter();
  const { accountType, setAccountType, completed, isHydrated } = useOnboarding();
  const { connected, publicKey } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (type: 'artisan' | 'client' | null) => {
    setAccountType(type);
  };

  /**
   * Picking an account type establishes the *server* session: the connected
   * wallet signs a server-issued challenge and the API mints the httpOnly
   * session cookie. Onboarding progress remains a client-only hint; the role
   * is recorded server-side and cannot be forged in localStorage.
   */
  const handleContinue = async () => {
    if (!accountType || submitting) return;
    setError(null);

    if (!connected || !publicKey) {
      router.push('/connect-wallet');
      return;
    }

    setSubmitting(true);
    try {
      await loginWithWallet(publicKey, accountType);
      router.push(
        accountType === 'artisan'
          ? '/profile-setup/artisan-step1'
          : '/profile-setup/client-form',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start your session. Please try again.',
      );
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (completed) {
      router.replace('/profile-setup/success');
    }
  }, [completed, isHydrated, router]);

  if (!isHydrated) {
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
      {submitting && (
        <p className="mb-4 text-sm text-[#6B6878]">
          Waiting for your wallet to sign the session challenge…
        </p>
      )}
      <AccountTypeSelection
        selectedType={accountType}
        onSelect={handleSelect}
        onContinue={handleContinue}
      />
    </div>
  );
}
