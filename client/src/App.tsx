import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { WalletProvider } from "@/lib/WalletContext";
import AppLayout from "@/components/AppLayout";
import MiningPage from "@/pages/mining";
import ReferralPage from "@/pages/referral";
import TasksPage from "@/pages/tasks";
import SubscriptionPage from "@/pages/subscription";
import LeaderboardPage from "@/pages/leaderboard";
import WithdrawalPage from "@/pages/withdrawal";
import AdminPage from "@/pages/admin";
import AdminLoginPage from "@/pages/admin-login";
import WalletLogin from "@/pages/wallet-login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={WalletLogin} />
      <Route path="/mining">
        <AppLayout>
          <MiningPage />
        </AppLayout>
      </Route>
      <Route path="/referral">
        <AppLayout>
          <ReferralPage />
        </AppLayout>
      </Route>
      <Route path="/tasks">
        <AppLayout>
          <TasksPage />
        </AppLayout>
      </Route>
      <Route path="/features">
        {() => <Redirect to="/mining" replace />}
      </Route>
      <Route path="/subscription">
        <AppLayout>
          <SubscriptionPage />
        </AppLayout>
      </Route>
      <Route path="/leaderboard">
        <AppLayout>
          <LeaderboardPage />
        </AppLayout>
      </Route>
      <Route path="/withdrawal">
        <AppLayout>
          <WithdrawalPage />
        </AppLayout>
      </Route>
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminPage} />
      <Route path="/">
        {() => <Redirect to="/login" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const manifestUrl = window.location.origin + '/tonconnect-manifest.json';
  
  return (
    <QueryClientProvider client={queryClient}>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </WalletProvider>
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}

export default App;