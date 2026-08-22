import TierProgress from '../TierProgress';

export default function TierProgressExample() {
  const tiers = [
    {
      name: "Bronze",
      minPoints: 0,
      benefits: ["Basic trading", "Standard support"],
      color: "bg-orange-600"
    },
    {
      name: "Silver",
      minPoints: 10000,
      benefits: ["Reduced fees", "Priority support", "Early access to features"],
      color: "bg-slate-400"
    },
    {
      name: "Gold",
      minPoints: 50000,
      benefits: ["VIP support", "Exclusive rewards", "Higher referral bonus"],
      color: "bg-chart-4"
    },
    {
      name: "Platinum",
      minPoints: 100000,
      benefits: ["Maximum benefits", "Personal account manager", "Premium airdrops"],
      color: "bg-chart-1"
    }
  ];

  return <TierProgress currentPoints={45280} tiers={tiers} />;
}