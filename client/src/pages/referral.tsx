import { useQuery } from "@tanstack/react-query";
import ReferralSection from "@/components/ReferralSection";

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
}

export default function ReferralPage() {
  const { data: referralData } = useQuery<ReferralData>({
    queryKey: ['/api/referrals'],
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <ReferralSection
          referralCode={referralData?.referralCode || ""}
          referralCount={referralData?.referralCount || 0}
          referralEarnings={referralData?.referralEarnings || 0}
        />
      </main>
    </div>
  );
}
