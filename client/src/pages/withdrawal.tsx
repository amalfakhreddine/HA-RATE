import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWallet } from "@/lib/WalletContext";
import { useLocation } from "wouter";
import { useTonConnectUI } from '@tonconnect/ui-react';
import { 
  Wallet, 
  ArrowDownToLine, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Coins
} from "lucide-react";
import { Address } from "@ton/core";

interface UserData {
  bittnexisBalance: string;
  walletAddress: string;
}

interface WithdrawalStatus {
  enabled: boolean;
  feeAmount: string;
  merchantWallet: string;
}

interface Withdrawal {
  id: string;
  walletAddress: string;
  amount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  feeTransactionHash: string;
  coinTransactionHash?: string;
  createdAt: string;
  processedAt?: string;
}

export default function WithdrawalPage() {
  const [amount, setAmount] = useState<string>('');
  const [feeTransactionHash, setFeeTransactionHash] = useState<string>('');
  const [isPayingFee, setIsPayingFee] = useState(false);
  const { toast } = useToast();
  const { walletAddress } = useWallet();
  const [, setLocation] = useLocation();
  const [tonConnectUI] = useTonConnectUI();

  // Get user data
  const { data: userData } = useQuery<UserData>({
    queryKey: ['/api/user'],
  });

  // Get withdrawal status
  const { data: withdrawalStatus } = useQuery<WithdrawalStatus>({
    queryKey: ['/api/withdrawals/status'],
  });

  // Get withdrawal history
  const { data: withdrawalHistory } = useQuery<{ withdrawals: Withdrawal[] }>({
    queryKey: ['/api/withdrawals'],
    enabled: !!walletAddress,
  });

  // Create withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      if (!feeTransactionHash || feeTransactionHash.trim() === '') {
        throw new Error('Please pay the withdrawal fee first');
      }

      const res = await apiRequest('/api/withdrawals/request', 'POST', {
        amount: parseFloat(amount),
        feeTransactionHash: feeTransactionHash.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted. The team will process it shortly.",
      });
      setAmount('');
      setFeeTransactionHash('');
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Unable to process withdrawal request",
        variant: "destructive",
      });
    },
  });

  const handlePayFee = async () => {
    if (!withdrawalStatus?.merchantWallet || !withdrawalStatus?.feeAmount) {
      toast({
        title: "Configuration Error",
        description: "Withdrawal configuration not available",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPayingFee(true);

      // Convert merchant wallet to correct format
      const merchantAddress = Address.parse(withdrawalStatus.merchantWallet);
      const merchantAddressStr = merchantAddress.toString({ bounceable: true });

      // Request payment from user's wallet
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: merchantAddressStr,
            amount: (parseFloat(withdrawalStatus.feeAmount) * 1e9).toString(), // Convert TON to nanoton
            payload: 'HA-RATE withdrawal fee',
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      
      if (result.boc) {
        // Extract transaction hash from BOC (Base64 encoded)
        const txHash = Buffer.from(result.boc, 'base64').toString('hex').substring(0, 64);
        setFeeTransactionHash(txHash);
        
        toast({
          title: "Fee Payment Sent",
          description: `Transaction hash: ${txHash.substring(0, 16)}...`,
        });
      }
    } catch (error: any) {
      console.error('Fee payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Unable to process fee payment",
        variant: "destructive",
      });
    } finally {
      setIsPayingFee(false);
    }
  };

  const handleWithdraw = () => {
    withdrawalMutation.mutate();
  };

  const handleMaxAmount = () => {
    if (userData?.bittnexisBalance) {
      setAmount(userData.bittnexisBalance);
    }
  };

  const getStatusIcon = (status: Withdrawal['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: Withdrawal['status']) => {
    const variants: Record<Withdrawal['status'], any> = {
      'pending': 'outline',
      'processing': 'default',
      'completed': 'default',
      'failed': 'destructive',
    };

    return (
      <Badge variant={variants[status]} data-testid={`badge-status-${status}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!withdrawalStatus?.enabled) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
              <h3 className="text-xl font-bold mb-2">Withdrawals Currently Disabled</h3>
              <p className="text-muted-foreground">
                The HA-RATE team has temporarily disabled withdrawals.
              </p>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-display mb-2" data-testid="text-page-title">
            Withdraw Coins
          </h1>
          <p className="text-muted-foreground">
            Transfer your HA-RATE coins to your TON wallet
          </p>
        </div>

        {/* Balance Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                <p className="text-3xl font-bold font-mono text-chart-1" data-testid="text-balance">
                  {parseFloat(userData?.bittnexisBalance || '0').toLocaleString()} HA-RATE
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-chart-1/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-chart-1" />
              </div>
            </div>
          </div>
        </Card>

        {/* Withdrawal Form */}
        <Card>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-4">Request Withdrawal</h3>
              
              {/* Disabled Message */}
              {!withdrawalStatus?.enabled && (
                <Card className="bg-muted/30 border-0 mb-4">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      <h4 className="font-bold">Withdrawals Disabled</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Withdrawals are currently disabled by the team. Please check back later.
                    </p>
                  </div>
                </Card>
              )}
              
              <div className="space-y-4">
                {/* Amount Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Withdrawal Amount (HA-RATE)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      disabled={!withdrawalStatus?.enabled}
                      data-testid="input-withdrawal-amount"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleMaxAmount}
                      disabled={!withdrawalStatus?.enabled}
                      data-testid="button-max-amount"
                    >
                      Max
                    </Button>
                  </div>
                </div>

                {/* Fee Payment */}
                <Card className="bg-muted/30 border-0">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Withdrawal Fee</span>
                      <span className="font-mono font-bold">{withdrawalStatus?.feeAmount} TON</span>
                    </div>
                    
                    <Button 
                      className="w-full"
                      variant="default"
                      onClick={handlePayFee}
                      disabled={!withdrawalStatus?.enabled || isPayingFee || !amount || parseFloat(amount) <= 0}
                      data-testid="button-pay-fee"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      {isPayingFee ? 'Processing...' : 'Pay Withdrawal Fee'}
                    </Button>

                    {feeTransactionHash && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Fee Transaction Hash</p>
                        <p className="font-mono text-xs break-all">{feeTransactionHash}</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Submit Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleWithdraw}
                  disabled={!withdrawalStatus?.enabled || !amount || !feeTransactionHash || withdrawalMutation.isPending}
                  data-testid="button-submit-withdrawal"
                >
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  {withdrawalMutation.isPending ? 'Submitting...' : 'Request Withdrawal'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Withdrawal History */}
        {withdrawalHistory && withdrawalHistory.withdrawals.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Withdrawal History</h3>
              <div className="space-y-3">
                {withdrawalHistory.withdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="bg-muted/30 border-0">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(withdrawal.status)}
                          <span className="font-bold font-mono">
                            {parseFloat(withdrawal.amount).toLocaleString()} HA-RATE
                          </span>
                        </div>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Requested: {new Date(withdrawal.createdAt).toLocaleString()}</p>
                        {withdrawal.processedAt && (
                          <p>Processed: {new Date(withdrawal.processedAt).toLocaleString()}</p>
                        )}
                        {withdrawal.coinTransactionHash && (
                          <p className="font-mono break-all">
                            Tx: {withdrawal.coinTransactionHash.substring(0, 32)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
