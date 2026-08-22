import RewardCard from '../RewardCard';

export default function RewardCardExample() {
  return (
    <RewardCard
      id="btc-voucher"
      image="https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400&h=300&fit=crop"
      title="$50 BTC Voucher"
      pointsCost={25000}
      category="Crypto"
      stock={15}
    />
  );
}