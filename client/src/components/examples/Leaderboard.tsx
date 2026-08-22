import Leaderboard from '../Leaderboard';

export default function LeaderboardExample() {
  const entries = [
    { rank: 1, username: 'CryptoKing', tokens: 285000 },
    { rank: 2, username: 'TraderPro', tokens: 198500 },
    { rank: 3, username: 'DiamondHands', tokens: 175200 },
    { rank: 4, username: 'LunarWhale', tokens: 152800 },
    { rank: 5, username: 'SatoshiFan', tokens: 128300, isCurrentUser: true },
  ];

  return <Leaderboard entries={entries} />;
}