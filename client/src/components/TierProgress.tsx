import { Card } from "@/components/ui/card";
import { Check, Lock } from "lucide-react";

interface Tier {
  name: string;
  minPoints: number;
  benefits: string[];
  color: string;
}

interface TierProgressProps {
  currentPoints: number;
  tiers: Tier[];
}

export default function TierProgress({ currentPoints, tiers }: TierProgressProps) {
  const getCurrentTierIndex = () => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (currentPoints >= tiers[i].minPoints) return i;
    }
    return 0;
  };

  const currentTierIndex = getCurrentTierIndex();

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-2xl font-bold mb-6">Membership Tiers</h3>
        
        <div className="space-y-4">
          {tiers.map((tier, index) => {
            const isUnlocked = index <= currentTierIndex;
            const isCurrent = index === currentTierIndex;
            
            return (
              <div
                key={tier.name}
                className={`relative p-4 rounded-lg border transition-all ${
                  isCurrent 
                    ? 'border-primary bg-primary/5' 
                    : isUnlocked 
                    ? 'border-border bg-card' 
                    : 'border-border bg-muted/20 opacity-60'
                }`}
                data-testid={`tier-${tier.name.toLowerCase()}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full ${tier.color} flex items-center justify-center flex-shrink-0`}>
                    {isUnlocked ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Lock className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">{tier.name}</h4>
                      <span className="text-sm font-mono text-muted-foreground">
                        {tier.minPoints.toLocaleString()} SBXP
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {tier.benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {isCurrent && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-primary text-primary-foreground">Current</Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}