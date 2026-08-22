import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pickaxe, Zap, Clock, LockKeyhole } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface MiningSectionProps {
  lastClaimTime?: Date;
  miningPower: number;
  pointsPerClaim: number;
  hasAutoMine?: boolean;
  miningPowerExpiryAt?: Date | null;
  autoMineExpiryAt?: Date | null;
}

export default function MiningSection({ lastClaimTime, miningPower, pointsPerClaim, miningPowerExpiryAt }: MiningSectionProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [canClaim, setCanClaim] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const last = lastClaimTime ? lastClaimTime.getTime() : now - 6 * 60 * 60 * 1000;
      const diff = last + 6 * 60 * 60 * 1000 - now;
      if (diff <= 0) { setCanClaim(true); setTimeLeft('READY'); return; }
      setCanClaim(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastClaimTime]);

  const claimMutation = useMutation({
    mutationFn: async () => (await apiRequest('/api/mining/claim', 'POST')).json(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      toast({ title: 'HA-RATE mined!', description: `+${Number(data.reward).toLocaleString()} HA-RATE` });
      setCanClaim(false);
    },
    onError: (error: any) => toast({ title: 'Mining failed', description: error.message || 'Try again later', variant: 'destructive' }),
  });

  const expiryText = miningPowerExpiryAt && miningPower > 1
    ? `Boost active until ${miningPowerExpiryAt.toLocaleDateString()}`
    : 'Free mining mode';

  return (
    <Card className="overflow-hidden border-purple-500/20 bg-[#0b0c12]">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-7">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Pickaxe className="w-7 h-7 text-purple-300" /></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-purple-300/70">Dragon mine</p><h3 className="text-2xl font-black">Mine. Wait. Claim.</h3><p className="text-sm text-slate-500">{expiryText}</p></div>
          </div>
          <Badge variant="outline" className="w-fit border-purple-500/30 text-purple-200 text-base px-4 py-2">{miningPower}× POWER</Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-black/25 border border-white/5 p-4"><div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-2"><Clock className="w-3.5 h-3.5"/> next claim</div><div className="font-mono font-black text-xl">{timeLeft}</div></div>
          <div className="rounded-xl bg-black/25 border border-white/5 p-4"><div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-2"><Zap className="w-3.5 h-3.5"/> mining power</div><div className="font-mono font-black text-xl">{miningPower}×</div></div>
          <div className="rounded-xl bg-black/25 border border-white/5 p-4"><div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-2"><Pickaxe className="w-3.5 h-3.5"/> reward</div><div className="font-mono font-black text-xl text-purple-300">{(pointsPerClaim * miningPower).toLocaleString()} MIZ</div></div>
        </div>

        <Button size="lg" className="w-full h-14 text-base font-black bg-gradient-to-r from-violet-700 to-fuchsia-700 hover:from-violet-600 hover:to-fuchsia-600 shadow-[0_0_35px_rgba(147,51,234,0.2)]" disabled={!canClaim || claimMutation.isPending} onClick={() => claimMutation.mutate()}>
          <Pickaxe className="w-5 h-5 mr-2" />{claimMutation.isPending ? 'MINING...' : canClaim ? `CLAIM ${(pointsPerClaim * miningPower).toLocaleString()} HA-RATE` : `LOCKED · ${timeLeft}`}
        </Button>

        <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex gap-3"><LockKeyhole className="w-5 h-5 text-purple-300 mt-0.5"/><div><p className="font-semibold">Free mining is intentionally slow</p><p className="text-sm text-slate-400">500 MIZ every 6 hours. It is possible to reach every level for free, but it takes patience.</p></div></div>
          {miningPower <= 1 && <Button variant="outline" className="shrink-0 border-purple-500/30" onClick={() => setLocation('/subscription')}>Get 5× · 0.5 TON</Button>}
        </div>
      </div>
    </Card>
  );
}
