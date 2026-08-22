import MiningSection from '../MiningSection';

export default function MiningSectionExample() {
  const lastClaimTime = new Date(Date.now() - 4 * 60 * 60 * 1000);
  
  return (
    <MiningSection
      lastClaimTime={lastClaimTime}
      miningPower={2}
      pointsPerClaim={1500}
    />
  );
}