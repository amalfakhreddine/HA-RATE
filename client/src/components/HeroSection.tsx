import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface HeroSectionProps {
  onDismiss: () => void;
}

export default function HeroSection({ onDismiss }: HeroSectionProps) {
  const [, setLocation] = useLocation();

  const handleStartMining = () => {
    onDismiss();
    setLocation('/mining');
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(120,119,198,0.1),transparent_50%)]" />
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Join the Airdrop - Earn $HA-RATE Tokens</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Earn Rewards, Mine $HA-RATE
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/80 mb-6 max-w-3xl mx-auto">
            Start earning tokens through our loyalty mining system built for active users.
          </p>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Mine and earn $HA-RATE tokens through our loyalty mining program.
          </p>

          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="gap-2 text-base"
              onClick={handleStartMining}
              data-testid="button-start-mining"
            >
              Start Mining
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}