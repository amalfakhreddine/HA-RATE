import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, LucideIcon } from "lucide-react";
import { useLocation } from "wouter";

interface EarningMethodCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  reward: string;
  action: string;
  iconColor: string;
  comingSoon?: boolean;
  hideReward?: boolean;
  route?: string;
  ariaLabel?: string;
}

export default function EarningMethodCard({ 
  icon: Icon, 
  title, 
  description, 
  reward, 
  action,
  iconColor,
  comingSoon = false,
  hideReward = false,
  route,
  ariaLabel
}: EarningMethodCardProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (route) {
      setLocation(route);
    } else {
      console.log(`${action} clicked`);
    }
  };

  return (
    <Card className={`h-full transition-transform ${comingSoon ? 'opacity-75' : 'hover-elevate active-elevate-2'}`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg ${iconColor} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {comingSoon && (
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          )}
        </div>
        
        <h3 className="text-xl font-semibold mb-2" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 flex-1">
          {description}
        </p>
        
        {!comingSoon && (
          <div className={`flex items-center ${hideReward ? 'justify-end' : 'justify-between'} pt-4 border-t border-border`}>
            {!hideReward && (
              <div>
                <p className="text-xs text-muted-foreground">Earn up to</p>
                <p className="text-lg font-bold font-mono text-primary">{reward}</p>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={handleClick}
              aria-label={ariaLabel || action}
              data-testid={`button-${action.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {action}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}