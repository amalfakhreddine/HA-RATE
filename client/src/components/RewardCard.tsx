import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import { useState } from "react";

interface RewardCardProps {
  id: string;
  image: string;
  title: string;
  pointsCost: number;
  category: string;
  stock?: number;
}

export default function RewardCard({ id, image, title, pointsCost, category, stock }: RewardCardProps) {
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    console.log(`Claiming reward: ${title}`);
    setClaimed(true);
    setTimeout(() => setClaimed(false), 2000);
  };

  return (
    <Card className="overflow-hidden hover-elevate active-elevate-2 transition-all">
      <div className="aspect-video bg-muted relative overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-2 right-2" variant="secondary">
          {category}
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2" data-testid={`text-reward-${id}`}>
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-primary">
              {pointsCost.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">SBXP</span>
          </div>
          {stock !== undefined && (
            <span className="text-xs text-muted-foreground">
              {stock} left
            </span>
          )}
        </div>
        <Button 
          className="w-full mt-3" 
          size="sm"
          onClick={handleClaim}
          disabled={claimed}
          data-testid={`button-claim-reward-${id}`}
        >
          <Gift className="w-4 h-4 mr-1.5" />
          {claimed ? "Claimed!" : "Claim Now"}
        </Button>
      </div>
    </Card>
  );
}