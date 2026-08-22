import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, Coins } from "lucide-react";
import { useLocation } from "wouter";

interface TokensBalanceProps { tokens: number; }

export default function TokensBalance({ tokens }: TokensBalanceProps) {
  const [, setLocation] = useLocation();
  return (
    <Card className="overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-950/70 via-[#10111a] to-[#090a10] shadow-[0_0_60px_rgba(126,34,206,0.10)]">
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-purple-300/70 mb-2">Your HA-RATE balance</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-300/30 flex items-center justify-center"><Coins className="w-6 h-6 text-amber-300" /></div>
            <div>
              <h2 className="text-4xl md:text-5xl font-black font-mono">{tokens.toLocaleString()}</h2>
              <span className="text-sm text-purple-300 font-semibold tracking-wider">HA-RATE</span>
            </div>
          </div>
        </div>
        <Button size="lg" variant="outline" onClick={() => setLocation('/withdrawal')} className="border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10">
          <ArrowDownToLine className="w-4 h-4 mr-2" /> Withdraw
        </Button>
      </div>
    </Card>
  );
}
