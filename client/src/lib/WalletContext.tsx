import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { useToast } from '@/hooks/use-toast';

interface WalletContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastAttemptedAddress, setLastAttemptedAddress] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast, dismiss } = useToast();
  const [currentToastId, setCurrentToastId] = useState<string | undefined>(undefined);

  console.log('[WalletContext] State:', { 
    tonAddress: tonAddress?.slice(0, 10), 
    walletAddress: walletAddress?.slice(0, 10),
    isConnecting,
    isAuthenticating,
    lastAttemptedAddress: lastAttemptedAddress?.slice(0, 10)
  });

  useEffect(() => {
    // Verify session with server on mount
    const verifySession = async () => {
      console.log('[WalletContext] Verifying existing session...');
      try {
        const response = await fetch('/api/user', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          console.log('[WalletContext] ✓ Found valid session for:', data.walletAddress.slice(0, 10) + '...');
          setWalletAddress(data.walletAddress);
          localStorage.setItem('walletAddress', data.walletAddress);
          setLastAttemptedAddress(data.walletAddress);
          
          // Clear any error toasts on successful session restore
          if (currentToastId) {
            dismiss(currentToastId);
            setCurrentToastId(undefined);
          }
        } else {
          console.log('[WalletContext] No valid session found');
          // No valid session, clear localStorage
          localStorage.removeItem('walletAddress');
          setWalletAddress(null);
        }
      } catch (error) {
        console.error('[WalletContext] Session verification failed:', error);
        localStorage.removeItem('walletAddress');
        setWalletAddress(null);
      }
    };

    verifySession();
  }, []);

  // Auto-authenticate when TonConnect wallet connects
  useEffect(() => {
    const authenticateWallet = async () => {
      // Don't authenticate if:
      // 1. No wallet is connected
      // 2. Already authenticated
      // 3. Currently connecting
      // 4. Already attempted auth for this exact address
      if (!tonAddress || walletAddress || isConnecting || tonAddress === lastAttemptedAddress) {
        return;
      }

      console.log('[WalletContext] Auto-auth triggered for:', tonAddress.slice(0, 10) + '...');

      // Check if we have a valid session
      try {
        const response = await fetch('/api/user', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          console.log('[WalletContext] ✓ Session already exists for:', data.walletAddress.slice(0, 10) + '...');
          setWalletAddress(data.walletAddress);
          setLastAttemptedAddress(tonAddress);
          return;
        }
      } catch (error) {
        console.log('[WalletContext] No existing session, will authenticate...');
      }

      // No valid session - trigger simple authentication
      console.log('[WalletContext] Starting auto-authentication...');
      setIsConnecting(true);
      setIsAuthenticating(true);

      try {
        if (!tonConnectUI?.wallet) {
          console.error('[WalletContext] TonConnect wallet not available');
          setIsConnecting(false);
          setIsAuthenticating(false);
          return;
        }

        const address = tonConnectUI.wallet.account.address;
        console.log('[WalletContext] Authenticating wallet:', address.slice(0, 10) + '...');

        // Mark attempt
        setLastAttemptedAddress(tonAddress);

        // Send simple authentication request
        const authRes = await fetch('/api/auth/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ address })
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          const walletAddress = authData.user.walletAddress; // UQ... format from backend (matches Tonkeeper)
          
          console.log('[WalletContext] ✓ Auto-authentication successful!');
          
          // Clear any previous error toasts
          if (currentToastId) {
            dismiss(currentToastId);
            setCurrentToastId(undefined);
          }
          
          // Show success message
          toast({
            title: "Wallet Connected",
            description: `Successfully connected ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          });
          
          setWalletAddress(walletAddress);
          localStorage.setItem('walletAddress', walletAddress);
        } else {
          console.error('[WalletContext] ✗ Auto-authentication failed');
          
          // Show error toast
          const { id } = toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Failed to create session. Please try again.",
          });
          setCurrentToastId(id);
          
          // Reset attempt marker so user can retry
          setLastAttemptedAddress(null);
        }
      } catch (error) {
        console.error('[WalletContext] Auto-authentication error:', error);
        
        // Show error toast
        const { id } = toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to authenticate wallet. Please try again.",
        });
        setCurrentToastId(id);
        
        // Reset attempt marker so user can retry
        setLastAttemptedAddress(null);
      } finally {
        setIsConnecting(false);
        setIsAuthenticating(false);
      }
    };

    authenticateWallet();
  }, [tonAddress, tonConnectUI, walletAddress, isConnecting, lastAttemptedAddress]);

  // Handle wallet disconnect - FIXED: Don't clear if we're authenticating
  useEffect(() => {
    if (!tonAddress && walletAddress && !isAuthenticating) {
      // Wallet disconnected AND we're not in auth flow, clear state
      console.log('[WalletContext] Wallet disconnected, clearing state');
      setWalletAddress(null);
      setLastAttemptedAddress(null);
      localStorage.removeItem('walletAddress');
    } else if (!tonAddress && isAuthenticating) {
      console.log('[WalletContext] tonAddress null but auth in progress - NOT clearing state');
    }
  }, [tonAddress, walletAddress, isAuthenticating]);

  const connectWallet = async () => {
    if (!tonConnectUI) {
      toast({
        variant: "destructive",
        title: "Wallet Not Ready",
        description: "TON Connect is initializing. Please wait a moment and try again.",
      });
      return null;
    }

    // Clear any previous error toasts when starting new connection attempt
    if (currentToastId) {
      dismiss(currentToastId);
      setCurrentToastId(undefined);
    }

    console.log('[WalletContext] Manual connect initiated');
    setIsConnecting(true);
    setIsAuthenticating(true);
    
    try {
      // Simple flow: just connect and accept wallet without ton_proof
      // The server will create session based on wallet address only
      if (!tonConnectUI.wallet) {
        console.log('[WalletContext] Opening wallet connection modal...');
        await tonConnectUI.openModal();
        
        // Wait for wallet connection
        await new Promise<void>((resolve) => {
          const checkWallet = setInterval(() => {
            if (tonConnectUI.wallet) {
              clearInterval(checkWallet);
              console.log('[WalletContext] Wallet connected');
              resolve();
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(checkWallet);
            console.log('[WalletContext] Wallet connection timeout');
            resolve();
          }, 30000);
        });
      }
      
      if (!tonConnectUI.wallet) {
        console.log('[WalletContext] No wallet connected');
        
        const { id } = toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "No wallet was connected. Please try again.",
        });
        setCurrentToastId(id);
        
        setIsConnecting(false);
        setIsAuthenticating(false);
        return null;
      }
      
      const address = tonConnectUI.wallet.account.address;
      console.log('[WalletContext] Wallet connected, authenticating:', address.slice(0, 10) + '...');
      
      // Send simple wallet address to backend (no ton_proof needed)
      try {
        const authRes = await fetch('/api/auth/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ address })
        });
        
        if (authRes.ok) {
          console.log('[WalletContext] ✓ Authentication successful!');
          
          // Clear any previous error toasts
          if (currentToastId) {
            dismiss(currentToastId);
            setCurrentToastId(undefined);
          }
          
          // Show success message
          toast({
            title: "Wallet Connected",
            description: `Successfully connected ${address.slice(0, 6)}...${address.slice(-4)}`,
          });
          
          setWalletAddress(address);
          setLastAttemptedAddress(address);
          setIsConnecting(false);
          setIsAuthenticating(false);
          return address;
        } else {
          console.error('[WalletContext] ✗ Authentication failed');
          
          const { id } = toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Failed to create session. Please try again.",
          });
          setCurrentToastId(id);
          
          setIsConnecting(false);
          setIsAuthenticating(false);
          return null;
        }
      } catch (error) {
        console.error('[WalletContext] ✗ Failed to authenticate:', error);
        
        const { id } = toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to authenticate wallet. Please try again.",
        });
        setCurrentToastId(id);
        
        setIsConnecting(false);
        setIsAuthenticating(false);
        return null;
      }
    } catch (error) {
      console.error('[WalletContext] Failed to connect wallet:', error);
      setIsConnecting(false);
      setIsAuthenticating(false);
      return null;
    }
  };

  const disconnectWallet = async () => {
    console.log('[WalletContext] Manual disconnect initiated');
    try {
      // Call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Disconnect TON wallet
      if (tonConnectUI) {
        await tonConnectUI.disconnect();
      }
    } catch (error) {
      console.error('[WalletContext] Logout error:', error);
    }
    
    setWalletAddress(null);
    setIsAuthenticating(false);
    localStorage.removeItem('walletAddress');
    console.log('[WalletContext] ✓ Disconnected');
  };

  return (
    <WalletContext.Provider
      value={{ walletAddress, isConnecting, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
