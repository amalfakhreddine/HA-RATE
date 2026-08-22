import { useWallet } from "@/lib/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Sparkles, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import logoImg from "@assets/WhatsApp Image 2025-10-12 at 22.46.31_78154f44_1760298460946.jpg";

export default function WalletLogin() {
  const { walletAddress, isConnecting, connectWallet } = useWallet();
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (walletAddress) {
      setLocation("/mining");
    }
  }, [walletAddress, setLocation]);

  const handleConnect = async () => {
    const address = await connectWallet();
    if (address) {
      setLocation("/mining");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              HA-RATE
            </h1>
            <p className="text-muted-foreground text-lg">
              Mine, Earn, and Trade TON Tokens
            </p>
          </div>
        </div>

        <Card className="border-primary/20 shadow-xl">
          <CardHeader className="text-center space-y-3 pb-4">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription className="text-base">
              Connect your TON wallet to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full h-auto py-5 text-base"
              size="lg"
              data-testid="button-connect-ton"
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5" />
                <span className="font-semibold">
                  {isConnecting ? "Connecting..." : "Connect TON Wallet"}
                </span>
              </div>
            </Button>
            
            <div className="space-y-3 pt-2">
              <p className="text-xs text-center text-muted-foreground">
                Supports Tonkeeper, OpenMask, UXUY Wallet & more
              </p>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-chart-1/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-chart-1" />
                  </div>
                  <span className="text-xs text-muted-foreground">Auto Mining</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-chart-2" />
                  </div>
                  <span className="text-xs text-muted-foreground">Earn Rewards</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
