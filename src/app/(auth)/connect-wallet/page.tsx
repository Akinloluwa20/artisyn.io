'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../../context/WalletProvider';

export default function ConnectWalletPage() {
  const router = useRouter();
  const {
    connected,
    connect,
    connectionStatus,
    connectionError,
    lastAttemptedWalletId,
    clearConnectionFeedback,
  } = useWallet();
  // The wallet whose button shows a spinner. Kept as the *pending* wallet and
  // narrowed to `null` once the connection settles, so the terminal states are
  // derived during render rather than synced from an effect — which is exactly
  // what `react-hooks/set-state-in-effect` rejects.
  const [pendingWallet, setPendingWallet] = useState<string | null>(null);
  const connectingWallet =
    connectionStatus === 'error' ||
    connectionStatus === 'canceled' ||
    connectionStatus === 'timeout' ||
    connectionStatus === 'idle'
      ? null
      : pendingWallet;
  const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);

  useEffect(() => {
    if (connected) {
      router.push('/account-type');
    }
  }, [connected, router]);

  const handleWalletConnect = async (
    walletId: 'freighter' | 'albedo' | 'lobstr',
  ) => {
    clearConnectionFeedback();
    setPendingWallet(walletId);
    try {
      await connect(walletId);
    } catch {
      // Error details live on connectionError / connectionStatus for the UI panel.
      setPendingWallet(null);
    }
  };

  const handleRetry = async () => {
    const walletId = (connectionError?.walletId ||
      lastAttemptedWalletId) as 'freighter' | 'albedo' | 'lobstr' | undefined;
    if (!walletId) {
      clearConnectionFeedback();
      return;
    }
    await handleWalletConnect(walletId);
  };

  const walletOptions = [
    { id: 'freighter', name: 'Freighter', logo: '/wallets/freighter-logo.png' },
    { id: 'albedo', name: 'Albedo', logo: '/wallets/albedo-logo.png' },
    { id: 'lobstr', name: 'Lobstr', logo: '/wallets/lobstr-logo.png' },
  ] as const;

  const showFeedbackPanel =
    connectionError !== null &&
    (connectionStatus === 'error' ||
      connectionStatus === 'canceled' ||
      connectionStatus === 'timeout');

  const feedbackTitle =
    connectionStatus === 'timeout'
      ? 'Connection timed out'
      : connectionStatus === 'canceled'
        ? 'Connection canceled'
        : 'Connection failed';

  return (
    <div className="min-h-screen flex bg-white">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <Image
            src="/Logo.png"
            alt="Artisyn.io"
            width={120}
            height={40}
            className="h-10 w-auto"
          />

          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900">
              Connect your wallet
            </h1>
            <p className="text-slate-600">
              Connect a wallet to secure your account and enable trusted
              interactions.
            </p>
          </div>

          {showFeedbackPanel && connectionError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-red-800">
                    {feedbackTitle}
                  </p>
                  <p className="text-sm text-red-700">
                    {connectionError.message}
                  </p>
                  {connectionError.walletName || connectionError.walletId ? (
                    <p className="text-xs text-red-600/80">
                      Wallet:{' '}
                      {connectionError.walletName || connectionError.walletId}
                      {connectionError.code
                        ? ` · ${connectionError.code.replace('_', ' ')}`
                        : null}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-8">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={connectingWallet !== null}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectingWallet ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Try again
                </button>
                <button
                  type="button"
                  onClick={clearConnectionFeedback}
                  disabled={connectingWallet !== null}
                  className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {connectionStatus === 'connecting' && connectingWallet && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>
                Connecting to{' '}
                {walletOptions.find((w) => w.id === connectingWallet)?.name ||
                  connectingWallet}
                … Approve the request in your wallet if prompted.
              </span>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-2 overflow-hidden">
            <div className="space-y-2">
              {walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletConnect(wallet.id)}
                  onMouseEnter={() => setHoveredWallet(wallet.id)}
                  onMouseLeave={() => setHoveredWallet(null)}
                  disabled={connectingWallet !== null}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg transition-all duration-200 relative ${
                    hoveredWallet === wallet.id ||
                    connectingWallet === wallet.id
                      ? 'bg-white'
                      : 'bg-transparent'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {(hoveredWallet === wallet.id ||
                    connectingWallet === wallet.id) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-blue-600 rounded-r" />
                  )}
                  <Image
                    src={wallet.logo}
                    alt={wallet.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                  <div className="flex-1 text-left font-medium text-sm text-slate-900">
                    {wallet.name}
                  </div>

                  {connectingWallet === wallet.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : hoveredWallet === wallet.id ? (
                    <span className="text-sm font-medium text-blue-600">
                      Connect
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="bg-black p-4 -mx-2 -mb-2 mt-2">
              <p className="text-xs text-center text-white">
                By connecting your wallet, you agree to our{' '}
                <Link href="/terms" className="text-pink-500 hover:underline">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-pink-500 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3 text-xs text-slate-600">
              <div className="flex-1 space-y-1">
                <p>• We&apos;ll never access your funds</p>
                <p>• Used only for account identity and platform actions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/artisyn.jpg"
          alt="Artisyn"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
