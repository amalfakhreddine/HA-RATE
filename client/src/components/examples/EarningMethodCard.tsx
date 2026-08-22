import EarningMethodCard from '../EarningMethodCard';
import { TrendingUp } from 'lucide-react';

export default function EarningMethodCardExample() {
  return (
    <EarningMethodCard
      icon={TrendingUp}
      title="Trading Futures"
      description="Earn HA-RATE on every trade with up to 200x leverage across 60+ pairs"
      reward="5,000 HA-RATE"
      action="Start Trading"
      iconColor="bg-chart-1"
    />
  );
}