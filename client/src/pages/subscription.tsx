import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Pickaxe, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/WalletContext";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { toNano } from "@ton/core";

export default function SubscriptionPage() {
  const [merchantWallet, setMerchantWallet] = useState('');
  const { walletAddress } = useWallet();
  const [tonConnectUI] = useTonConnectUI();
  const { toast } = useToast();

  useEffect(() => { fetch('/api/merchant-wallet').then(r=>r.json()).then(d=>setMerchantWallet(d.address)).catch(()=>{}); }, []);

  const boostMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error('Connect your TON wallet first');
      if (!merchantWallet) throw new Error('Merchant wallet is not ready');
      const create = await (await apiRequest('/api/payments/create', 'POST', { package: 'dragon_boost' })).json();
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now()/1000)+300,
        messages: [{ address: merchantWallet, amount: toNano('0.5').toString() }]
      });
      const verify = await (await apiRequest('/api/payments/verify', 'POST', { paymentId: create.paymentId })).json();
      if (!verify.success) throw new Error(verify.error || 'Payment not confirmed yet');
      return verify;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ title: 'Dragon boost activated', description: '5× mining power is active for 30 days.' });
    },
    onError: (e:any) => toast({ title: 'Boost not activated', description: e.message, variant: 'destructive' })
  });

  return <div className="min-h-screen bg-[#06070b] pb-24 text-white">
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8"><p className="text-xs uppercase tracking-[0.24em] text-purple-300/70">optional upgrade</p><h1 className="text-4xl font-black mt-2">Boost your dragon</h1><p className="text-slate-400 mt-3">Mining stays possible for free. This simply makes the grind much faster.</p></div>
      <Card className="overflow-hidden border-fuchsia-500/30 bg-gradient-to-br from-purple-950/60 via-[#11121a] to-[#08090e]">
        <div className="grid md:grid-cols-[1fr_320px]">
          <div className="p-7 md:p-9">
            <Badge className="bg-purple-600 mb-5">DRAGON BOOST</Badge>
            <div className="flex items-center gap-3 mb-3"><Zap className="w-8 h-8 text-fuchsia-300"/><h2 className="text-3xl font-black">5× Mining Power</h2></div>
            <div className="text-5xl font-black my-5">0.5 <span className="text-2xl text-sky-300">TON</span></div>
            <ul className="space-y-3 text-slate-300 mb-7"><li className="flex gap-2"><Pickaxe className="w-5 h-5 text-purple-300"/>2,500 MIZ per 6-hour claim instead of 500</li><li className="flex gap-2"><ShieldCheck className="w-5 h-5 text-purple-300"/>active for 30 days</li><li className="flex gap-2"><Zap className="w-5 h-5 text-purple-300"/>no auto-renewal</li></ul>
            <Button size="lg" className="w-full h-14 bg-gradient-to-r from-violet-700 to-fuchsia-700 hover:from-violet-600 hover:to-fuchsia-600 font-black" onClick={()=>boostMutation.mutate()} disabled={boostMutation.isPending}>{boostMutation.isPending ? 'CHECKING PAYMENT...' : 'ACTIVATE FOR 0.5 TON'}</Button>
            <p className="text-xs text-slate-500 mt-3 text-center">TON wallet confirmation is required before activation.</p>
          </div>
          <div className="min-h-[330px] relative bg-black"><img src="/dragon-level-15.jpg" className="absolute inset-0 w-full h-full object-cover" alt="Boosted HA-RATE dragon"/><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-purple-950/20"/></div>
        </div>
      </Card>
    </main>
  </div>;
}
