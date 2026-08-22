import { useQuery } from "@tanstack/react-query";
import Leaderboard from "@/components/Leaderboard";

interface LeaderboardEntry {
  rank: number;
  username: string;
  tokens: number;
  isCurrentUser?: boolean;
}

export default function LeaderboardPage() {
  const { data: leaderboardEntries = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard'],
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <Leaderboard entries={leaderboardEntries} />
      </main>
    </div>
  );
}
