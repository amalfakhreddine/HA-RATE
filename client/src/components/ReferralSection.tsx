import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, DollarSign } from "lucide-react";
import { SiX } from "react-icons/si";
import { useState } from "react";

interface ReferralSectionProps {
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
}

export default function ReferralSection({ referralCode, referralCount, referralEarnings }: ReferralSectionProps) {
  const [copied, setCopied] = useState(false);
  const referralLink = `/referral?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnX = () => {
    const text = `Join HA-RATE and earn HA-RATE rewards! Use my referral code: ${referralCode}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };


  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-chart-2/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-chart-2" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Referral Program</h3>
            <p className="text-sm text-muted-foreground">Earn 1 token per referral</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Your Referral Link</label>
              <div className="flex gap-2">
                <Input 
                  value={referralLink} 
                  readOnly 
                  className="font-mono text-sm"
                  data-testid="input-referral-link"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-muted/30 border-0">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-chart-2" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-referral-count">
                      {referralCount}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-muted/30 border-0">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-chart-3" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Earnings from Referrals</p>
                    <p className="text-2xl font-bold font-mono text-chart-3" data-testid="text-referral-earnings">
                      {referralEarnings.toLocaleString()} HA-RATE
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex gap-3">
            <div className="text-3xl">🎁</div>
            <div>
              <h4 className="font-semibold mb-1">Welcome Bonus</h4>
              <p className="text-sm text-muted-foreground">
                You and your friend both get <strong className="text-foreground">1 HA-RATE</strong> when they sign up
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}