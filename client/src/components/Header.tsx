import { Button } from "@/components/ui/button";
import { LogOut, WalletCards } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useWallet } from "@/lib/WalletContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Header() {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [, setLocation] = useLocation();
  const { walletAddress, disconnectWallet } = useWallet();

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    await disconnectWallet();
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-500/20 bg-[#07080d]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button onClick={() => setLocation('/mining')} className="flex items-center gap-3 group">
            <img src="/mizorate-logo.png" alt="HA-RATE dragon logo" className="w-10 h-10 rounded-full object-cover ring-1 ring-purple-500/50" />
            <div className="text-left leading-tight">
              <div className="font-black tracking-[0.12em] text-xl bg-gradient-to-r from-fuchsia-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">HA-RATE</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">mine • evolve • dominate</div>
            </div>
          </button>

          {walletAddress ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-400 font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              <Button variant="outline" size="sm" className="border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10" onClick={() => setShowLogoutDialog(true)}>
                <LogOut className="w-4 h-4 mr-2" /> Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={() => setLocation('/login')} className="bg-purple-600 hover:bg-purple-500">
              <WalletCards className="w-4 h-4 mr-2" /> Connect Wallet
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md bg-[#0c0d14] border-purple-500/20">
          <DialogHeader>
            <DialogTitle>Disconnect wallet?</DialogTitle>
            <DialogDescription>Your HA-RATE progress stays saved to this wallet address.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleLogout}>Disconnect</Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
