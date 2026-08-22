import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TokensBalance from "@/components/PointsBalance";
import EarningMethodCard from "@/components/EarningMethodCard";
import ReferralSection from "@/components/ReferralSection";
import TaskCard from "@/components/TaskCard";
import MiningSection from "@/components/MiningSection";
import Leaderboard from "@/components/Leaderboard";
import { TrendingUp, Users, CheckSquare } from "lucide-react";
import logoImg from "@assets/WhatsApp Image 2025-10-12 at 22.46.31_78154f44_1760298460946.jpg";
import { useQuery } from "@tanstack/react-query";

interface UserData {
  bittnexisBalance: string;
  usdtBalance: string;
  referralCode: string;
  miningPower: number;
  hasAutoMine: boolean;
  lastClaimTime: string | null;
  miningPowerExpiryAt?: string | null;
  autoMineExpiryAt?: string | null;
}

interface TaskData {
  taskId: string;
  progress: number;
  completed: boolean;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  tokens: number;
  isCurrentUser?: boolean;
}

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
}

export default function LoyaltyPage() {
  // Fetch user data
  const { data: userData } = useQuery<UserData>({
    queryKey: ['/api/user'],
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery<TaskData[]>({
    queryKey: ['/api/tasks'],
  });

  // Fetch leaderboard
  const { data: leaderboardEntries = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard'],
  });

  // Fetch referral data
  const { data: referralData } = useQuery<ReferralData>({
    queryKey: ['/api/referrals'],
  });

  const earningMethods = [
    {
      icon: TrendingUp,
      title: "Trading Futures",
      description: "Earn HA-RATE on every trade with up to 200x leverage across 60+ pairs",
      reward: "5,000 HA-RATE",
      action: "Start Trading",
      iconColor: "bg-chart-1",
      comingSoon: true
    },
    {
      icon: Users,
      title: "Referral Program",
      description: "Earn 1 token for every friend you invite",
      reward: "10,000 HA-RATE",
      action: "Invite Friends",
      iconColor: "bg-chart-2",
      hideReward: true
    },
    {
      icon: CheckSquare,
      title: "Daily Tasks",
      description: "Complete simple actions and challenges to earn bonus tokens",
      reward: "2,000 HA-RATE",
      action: "View Tasks",
      iconColor: "bg-chart-4",
      hideReward: true
    }
  ];

  const taskDefinitions = [
    {
      id: "daily-login",
      title: "Daily Login",
      description: "Claim your daily login reward",
      reward: 0.2,
      total: 1
    },
  ];

  // Merge task definitions with backend data
  const mergedTasks = taskDefinitions.map(def => {
    const backendTask = tasks.find((t: TaskData) => t.taskId === def.id);
    return {
      ...def,
      progress: backendTask?.progress || 0,
      completed: backendTask?.completed || false,
    };
  });

  // Calculate today's earnings (simplified)
  const todayEarnings = 0;

  // Find user rank from leaderboard
  const userRank = leaderboardEntries.findIndex((entry: any) => entry.isCurrentUser) + 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <HeroSection />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-16">
        <section>
          <TokensBalance 
            tokens={userData ? parseFloat(userData.bittnexisBalance) : 0} 
            todayEarnings={todayEarnings} 
            rank={userRank || 0}
            usdtBalance={userData ? parseFloat(userData.usdtBalance) : 0}
          />
        </section>

        <section>
          <h2 className="text-3xl font-bold font-display mb-6">Earning Opportunities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {earningMethods.map((method, index) => (
              <EarningMethodCard key={index} {...method} />
            ))}
          </div>
        </section>

        <section>
          <ReferralSection
            referralCode={referralData?.referralCode || ""}
            referralCount={referralData?.referralCount || 0}
            referralEarnings={referralData?.referralEarnings || 0}
          />
        </section>

        <section>
          <h2 className="text-3xl font-bold font-display mb-6">Daily Tasks & Challenges</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {mergedTasks.map((task) => (
              <TaskCard key={task.id} {...task} />
            ))}
          </div>
        </section>

        <section>
          <MiningSection
            lastClaimTime={userData?.lastClaimTime ? new Date(userData.lastClaimTime) : undefined}
            miningPower={userData?.miningPower || 1}
            pointsPerClaim={0.2}
            hasAutoMine={userData?.hasAutoMine || false}
            miningPowerExpiryAt={userData?.miningPowerExpiryAt ? new Date(userData.miningPowerExpiryAt) : null}
            autoMineExpiryAt={userData?.autoMineExpiryAt ? new Date(userData.autoMineExpiryAt) : null}
          />
        </section>

        <section>
          <Leaderboard entries={leaderboardEntries} />
        </section>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src={logoImg} 
                  alt="HA-RATE Logo" 
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="font-bold text-xl font-display">HA-RATE</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-Powered 200X Trading & Rewards Platform
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Trading</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Loyalty</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Wallet</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2024 HA-RATE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
