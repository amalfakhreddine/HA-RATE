import { useQuery } from "@tanstack/react-query";
import MiningSection from "@/components/MiningSection";
import TokensBalance from "@/components/PointsBalance";
import DragonProgress from "@/components/DragonProgress";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pickaxe, Zap, Users, ListChecks } from "lucide-react";
import { useLocation } from "wouter";

interface UserData {
  bittnexisBalance: string;
  referralCode: string;
  miningPower: number;
  hasAutoMine: boolean;
  lastClaimTime: string | null;
  miningPowerExpiryAt?: string | null;
  autoMineExpiryAt?: string | null;
}

export default function MiningPage() {
  const { data: userData } = useQuery<UserData>({ queryKey: ['/api/user'] });
  const [, setLocation] = useLocation();
  const balance = userData ? parseFloat(userData.bittnexisBalance) : 0;
  const miningPower = userData?.miningPower || 1;

  return (
    <div className="min-h-screen bg-[#09040f] pb-24 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-6 items-stretch">
          <TokensBalance tokens={balance} />
          <Card className="border-purple-500/20 bg-[#14091f] p-6 flex items-center justify-between">
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Current mining rate</p><div className="text-3xl font-black">{500 * miningPower} <span className="text-lg text-purple-300">HA-RATE / claim</span></div><p className="text-sm text-slate-500 mt-2">one claim every 6 hours</p></div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Pickaxe className="w-7 h-7 text-purple-300" /></div>
          </Card>
        </section>

        <DragonProgress balance={balance} />

        <MiningSection
          lastClaimTime={userData?.lastClaimTime ? new Date(userData.lastClaimTime) : undefined}
          miningPower={miningPower}
          pointsPerClaim={500}
          hasAutoMine={userData?.hasAutoMine || false}
          miningPowerExpiryAt={userData?.miningPowerExpiryAt ? new Date(userData.miningPowerExpiryAt) : null}
          autoMineExpiryAt={userData?.autoMineExpiryAt ? new Date(userData.autoMineExpiryAt) : null}
        />

        <section>
          <div className="flex items-end justify-between mb-4"><div><p className="text-xs uppercase tracking-[0.2em] text-purple-300/70">more ways to grow</p><h2 className="text-2xl font-black">Earn HA-RATE</h2></div></div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-5 border-purple-500/20 bg-[#14091f]"><Users className="w-6 h-6 text-purple-300 mb-4"/><h3 className="font-bold text-lg">Referrals</h3><p className="text-sm text-slate-400 mt-1 mb-4">Invite friends and speed up your climb without paying.</p><Button variant="outline" className="w-full" onClick={() => setLocation('/referral')}>Invite friends</Button></Card>
            <Card className="p-5 border-purple-500/20 bg-[#14091f]"><ListChecks className="w-6 h-6 text-purple-300 mb-4"/><h3 className="font-bold text-lg">Tasks</h3><p className="text-sm text-slate-400 mt-1 mb-4">Complete in-app challenges. Social channel links are disabled for now.</p><Button variant="outline" className="w-full" onClick={() => setLocation('/tasks')}>View tasks</Button></Card>
            <Card className="p-5 border-fuchsia-500/30 bg-gradient-to-br from-purple-950/70 to-[#0b0c12]"><Zap className="w-6 h-6 text-fuchsia-300 mb-4"/><h3 className="font-bold text-lg">5× Dragon Boost</h3><p className="text-sm text-slate-400 mt-1 mb-4">Pay 0.5 TON once and mine 5× faster for 30 days.</p><Button className="w-full bg-purple-600 hover:bg-purple-500" onClick={() => setLocation('/subscription')}>Boost for 0.5 TON</Button></Card>
          </div>
        </section>
      </main>
    </div>
  );
}
