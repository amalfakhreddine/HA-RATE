import { Link, useLocation } from "wouter";
import { Pickaxe, Users, CheckSquare, CreditCard, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/mining", label: "Mining", icon: Pickaxe },
  { path: "/referral", label: "Referral", icon: Users },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/subscription", label: "Subscribe", icon: CreditCard },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function BottomTabBar() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t z-50 pb-safe"
      role="navigation"
      aria-label="Main navigation"
      data-testid="nav-bottom-tabs"
    >
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location === tab.path;
            
            return (
              <Link
                key={tab.path}
                href={tab.path}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                data-testid={`tab-${tab.label.toLowerCase()}`}
              >
                <div
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px] min-h-[48px] hover-elevate focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon 
                    className={cn(
                      "w-5 h-5 transition-transform",
                      isActive && "scale-110"
                    )} 
                  />
                  <span 
                    className={cn(
                      "text-xs font-medium transition-all",
                      isActive && "font-semibold"
                    )}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
