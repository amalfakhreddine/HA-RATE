import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar?: string;
  tokens: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-chart-4';
    if (rank === 2) return 'text-slate-400';
    if (rank === 3) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-chart-4/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-chart-4" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Leaderboard</h3>
            <p className="text-sm text-muted-foreground">Top earners this month</p>
          </div>
        </div>

        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                entry.isCurrentUser 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'hover-elevate'
              }`}
              data-testid={`leaderboard-rank-${entry.rank}`}
            >
              <div className="flex items-center justify-center w-8">
                {entry.rank <= 3 ? (
                  <Medal className={`w-6 h-6 ${getMedalColor(entry.rank)}`} />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    #{entry.rank}
                  </span>
                )}
              </div>

              <Avatar className="w-10 h-10">
                <AvatarImage src={entry.avatar} alt={entry.username} />
                <AvatarFallback>{entry.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.username}</p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold font-mono" data-testid={`points-rank-${entry.rank}`}>
                  {entry.tokens.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Mizorate</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}