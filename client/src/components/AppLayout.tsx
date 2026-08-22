import { ReactNode, useState, useEffect } from "react";
import { useWallet } from "@/lib/WalletContext";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BottomTabBar from "@/components/BottomTabBar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { walletAddress } = useWallet();
  const [, setLocation] = useLocation();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setLocation("/login");
    }
  }, [walletAddress, setLocation]);

  useEffect(() => {
    if (walletAddress) {
      const introKey = `seenIntro::${walletAddress}`;
      const hasSeenIntro = localStorage.getItem(introKey);
      
      if (!hasSeenIntro) {
        setShowIntro(true);
      }
    } else {
      setShowIntro(false);
    }
  }, [walletAddress]);

  const handleDismissIntro = () => {
    if (walletAddress) {
      const introKey = `seenIntro::${walletAddress}`;
      localStorage.setItem(introKey, "true");
      setShowIntro(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="app-layout">
      <Header />
      
      {showIntro && <HeroSection onDismiss={handleDismissIntro} />}
      
      {children}
      
      <BottomTabBar />
    </div>
  );
}
