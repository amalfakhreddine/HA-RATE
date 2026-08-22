import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  Settings, 
  ListTodo, 
  DollarSign, 
  Rocket,
  BarChart3,
  Shield,
  Trash2,
  Edit,
  Plus,
  Check,
  X,
  LogOut,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Zap
} from "lucide-react";

interface AdminConfig {
  miningIntervalHours: number;
  miningBaseReward: number;
  subscriptionPrices: { [key: string]: number };
  tgeEnabled: boolean;
  tgeDate: string | null;
  withdrawalActive: boolean;
  registrationsPaused: boolean;
}

interface TaskDefinition {
  id: string;
  taskId: string;
  title: string;
  description: string;
  reward: number;
  type: 'daily' | 'one_time' | 'social';
  action: string;
  iconType?: string;
  verificationRequired?: boolean;
  verificationUrl?: string;
  resetInterval?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalHARATEDistributed: number;
  activeSubscriptions: number;
  totalTaskDefinitions: number;
  completedUserTasks: number;
}

interface AuthStatus {
  authenticated: boolean;
  username?: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showTgePinDialog, setShowTgePinDialog] = useState(false);
  const [tgePin, setTgePin] = useState('');

  // Check authentication status
  const { data: authStatus, isLoading: authLoading } = useQuery<AuthStatus>({
    queryKey: ['/api/admin/auth/status'],
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && authStatus && !authStatus.authenticated) {
      setLocation('/admin/login');
    }
  }, [authStatus, authLoading, setLocation]);

  // Get admin configuration
  const { data: config } = useQuery<AdminConfig>({
    queryKey: ['/api/admin/config'],
    enabled: authStatus?.authenticated === true,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Get task definitions
  const { data: tasksData } = useQuery<{ tasks: TaskDefinition[] }>({
    queryKey: ['/api/admin/tasks'],
    enabled: authStatus?.authenticated === true,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Get admin stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: authStatus?.authenticated === true,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/admin/auth/logout', 'POST');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
      setLocation('/admin/login');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    },
  });

  // Mining config mutation
  const updateMiningMutation = useMutation({
    mutationFn: async (data: { miningIntervalHours: number; miningBaseReward: number }) => {
      const res = await apiRequest('/api/admin/config/mining', 'POST', data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/config'] });
      toast({
        title: "Success",
        description: "Mining configuration updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update mining configuration",
        variant: "destructive",
      });
    },
  });

  // Subscription prices mutation
  const updatePricesMutation = useMutation({
    mutationFn: async (prices: { [key: string]: number }) => {
      const res = await apiRequest('/api/admin/config/prices', 'POST', { prices });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/subscription-prices'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/config'] });
      await queryClient.refetchQueries({ queryKey: ['/api/subscription-prices'] });
      toast({
        title: "Success",
        description: "Subscription prices updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription prices",
        variant: "destructive",
      });
    },
  });

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('/api/admin/tasks', 'POST', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      setIsAddingTask(false);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const res = await apiRequest(`/api/admin/tasks/${taskId}`, 'PUT', updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      setEditingTask(null);
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest(`/api/admin/tasks/${taskId}`, 'DELETE');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  // TGE mutations
  const enableTGEMutation = useMutation({
    mutationFn: async (tgeDate?: string) => {
      const res = await apiRequest('/api/admin/tge/enable', 'POST', { tgeDate });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/config'] });
      toast({
        title: "TGE Enabled",
        description: "All subscriptions have been terminated. Users can now withdraw their tokens.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enable TGE",
        variant: "destructive",
      });
    },
  });

  const disableTGEMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/admin/tge/disable', 'POST', {});
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/config'] });
      toast({
        title: "TGE Disabled",
        description: "TGE has been disabled. System restored to normal operation.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable TGE",
        variant: "destructive",
      });
    },
  });

  // Withdrawal activation mutation
  const toggleWithdrawalMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const res = await apiRequest('/api/admin/config/withdrawal-active', 'POST', { active });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/config'] });
      toast({
        title: "Success",
        description: "Withdrawal setting updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update withdrawal setting",
        variant: "destructive",
      });
    },
  });

  // Registrations pause mutation
  const toggleRegistrationsMutation = useMutation({
    mutationFn: async (paused: boolean) => {
      const res = await apiRequest('/api/admin/config/registrations-paused', 'POST', { paused });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/config'] });
      toast({
        title: "Success",
        description: "User registration setting updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update registration setting",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const handleMiningConfigSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMiningMutation.mutate({
      miningIntervalHours: parseFloat(formData.get('miningIntervalHours') as string),
      miningBaseReward: parseFloat(formData.get('miningBaseReward') as string),
    });
  };

  const handlePricesSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updatePricesMutation.mutate({
      auto_mine: parseFloat(formData.get('auto_mine') as string),
      '2x_power': parseFloat(formData.get('2x_power') as string),
      '3x_power': parseFloat(formData.get('3x_power') as string),
      '4x_power': parseFloat(formData.get('4x_power') as string),
    });
  };

  const handleTaskSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const taskData = {
      taskId: formData.get('taskId') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      reward: parseFloat(formData.get('reward') as string),
      type: formData.get('type') as 'daily' | 'one_time' | 'social',
      action: formData.get('action') as string,
      iconType: formData.get('iconType') as string || 'CheckSquare',
      verificationRequired: formData.get('verificationRequired') === 'on',
      isActive: formData.get('isActive') === 'on',
    };

    if (editingTask) {
      updateTaskMutation.mutate({ taskId: editingTask.taskId, updates: taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  // Handle TGE enable with PIN validation
  const handleEnableTGE = () => {
    const CORRECT_PIN = '618504';
    
    if (tgePin !== CORRECT_PIN) {
      toast({
        title: "Invalid PIN",
        description: "The PIN code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // PIN is correct, proceed with TGE
    if (confirm('Are you absolutely sure you want to enable TGE? This will terminate all subscriptions and cannot be undone.')) {
      enableTGEMutation.mutate(undefined);
      setShowTgePinDialog(false);
      setTgePin('');
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!authStatus?.authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 border-b">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-xl">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold font-display text-white">Admin Panel</h1>
                {authStatus.username && (
                  <p className="text-sm text-slate-400">Logged in as <span className="font-medium text-slate-200">{authStatus.username}</span></p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
          <p className="text-slate-400 mt-2">Manage your HA-RATE application</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="mining" data-testid="tab-mining">
              <Settings className="w-4 h-4 mr-2" />
              Mining
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <ListTodo className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="prices" data-testid="tab-prices">
              <DollarSign className="w-4 h-4 mr-2" />
              Prices
            </TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">
              <Wallet className="w-4 h-4 mr-2" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              User Controls
            </TabsTrigger>
            <TabsTrigger value="tge" data-testid="tab-tge">
              <Rocket className="w-4 h-4 mr-2" />
              TGE
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 hover-elevate">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Users</h3>
                    <p className="text-3xl font-bold">{stats?.totalUsers?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-chart-1/10 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-chart-1" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 hover-elevate">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Tokens Distributed</h3>
                    <p className="text-3xl font-bold">{stats?.totalHA-RATEDistributed?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-chart-2/10 p-3 rounded-lg">
                    <Wallet className="w-6 h-6 text-chart-2" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 hover-elevate">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Subscriptions</h3>
                    <p className="text-3xl font-bold">{stats?.activeSubscriptions?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-chart-3/10 p-3 rounded-lg">
                    <Zap className="w-6 h-6 text-chart-3" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 hover-elevate">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Task Definitions</h3>
                    <p className="text-3xl font-bold">{stats?.totalTaskDefinitions?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-chart-4/10 p-3 rounded-lg">
                    <ListTodo className="w-6 h-6 text-chart-4" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 hover-elevate">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed Tasks</h3>
                    <p className="text-3xl font-bold">{stats?.completedUserTasks?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-chart-5/10 p-3 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-chart-5" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 hover-elevate">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">TGE Status</h3>
                    <Badge variant={config?.tgeEnabled ? "default" : "secondary"} className="mt-1">
                      {config?.tgeEnabled ? "Enabled" : "Not Enabled"}
                    </Badge>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Rocket className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Mining Config Tab */}
          <TabsContent value="mining">
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-display">Mining Configuration</h2>
              </div>
              <form onSubmit={handleMiningConfigSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="miningIntervalHours" className="text-base">Mining Interval (Hours)</Label>
                    <Input
                      id="miningIntervalHours"
                      name="miningIntervalHours"
                      type="number"
                      step="0.1"
                      defaultValue={config?.miningIntervalHours || 6}
                      required
                      data-testid="input-mining-interval"
                      className="h-11"
                    />
                    <p className="text-sm text-muted-foreground">
                      Time between mining claims <span className="font-medium text-foreground">(current: {config?.miningIntervalHours || 6}h)</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="miningBaseReward" className="text-base">Base Mining Reward (HA-RATE)</Label>
                    <Input
                      id="miningBaseReward"
                      name="miningBaseReward"
                      type="number"
                      step="0.01"
                      defaultValue={config?.miningBaseReward || 0.2}
                      required
                      data-testid="input-base-reward"
                      className="h-11"
                    />
                    <p className="text-sm text-muted-foreground">
                      Base tokens per claim <span className="font-medium text-foreground">(current: {config?.miningBaseReward || 0.2})</span>
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={updateMiningMutation.isPending}
                  data-testid="button-update-mining"
                  className="w-full md:w-auto"
                >
                  {updateMiningMutation.isPending ? 'Updating...' : 'Update Mining Config'}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <ListTodo className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold font-display">Task Definitions</h2>
                </div>
                <Button
                  onClick={() => setIsAddingTask(true)}
                  data-testid="button-add-task"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>

              {(isAddingTask || editingTask) && (
                <Card className="mb-6 p-6 bg-primary/5">
                  <div className="flex items-center gap-2 mb-6">
                    <Edit className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                  </div>
                  <form onSubmit={handleTaskSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="taskId" className="text-base">Task ID</Label>
                        <Input
                          id="taskId"
                          name="taskId"
                          defaultValue={editingTask?.taskId || ''}
                          required
                          disabled={!!editingTask}
                          placeholder="e.g., follow_x"
                          data-testid="input-task-id"
                          className="h-11"
                        />
                        <p className="text-sm text-muted-foreground">Unique identifier for this task</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-base">Title</Label>
                        <Input
                          id="title"
                          name="title"
                          defaultValue={editingTask?.title || ''}
                          required
                          placeholder="e.g., Follow on X"
                          data-testid="input-task-title"
                          className="h-11"
                        />
                        <p className="text-sm text-muted-foreground">Display name for the task</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base">Description</Label>
                      <Input
                        id="description"
                        name="description"
                        defaultValue={editingTask?.description || ''}
                        required
                        placeholder="e.g., Follow us on X (formerly Twitter)"
                        data-testid="input-task-description"
                        className="h-11"
                      />
                      <p className="text-sm text-muted-foreground">Detailed task instructions</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="reward" className="text-base">Reward (HA-RATE)</Label>
                        <Input
                          id="reward"
                          name="reward"
                          type="number"
                          step="0.01"
                          defaultValue={editingTask?.reward || 1}
                          required
                          data-testid="input-task-reward"
                          className="h-11"
                        />
                        <p className="text-sm text-muted-foreground">Tokens earned on completion</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type" className="text-base">Type</Label>
                        <select
                          id="type"
                          name="type"
                          defaultValue={editingTask?.type || 'one_time'}
                          className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          required
                          data-testid="select-task-type"
                        >
                          <option value="one_time">One Time</option>
                          <option value="daily">Daily</option>
                          <option value="social">Social</option>
                        </select>
                        <p className="text-sm text-muted-foreground">Task repetition type</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="action" className="text-base">Action Text</Label>
                        <Input
                          id="action"
                          name="action"
                          defaultValue={editingTask?.action || 'Complete'}
                          required
                          data-testid="input-task-action"
                          className="h-11"
                        />
                        <p className="text-sm text-muted-foreground">Button text label</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 p-4 bg-background rounded-lg border">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="verificationRequired"
                          name="verificationRequired"
                          defaultChecked={editingTask?.verificationRequired ?? true}
                          className="h-4 w-4"
                          data-testid="checkbox-verification"
                        />
                        <Label htmlFor="verificationRequired" className="cursor-pointer">Verification Required</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          defaultChecked={editingTask?.isActive ?? true}
                          className="h-4 w-4"
                          data-testid="checkbox-active"
                        />
                        <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" data-testid="button-save-task">
                        {editingTask ? 'Update Task' : 'Create Task'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddingTask(false);
                          setEditingTask(null);
                        }}
                        data-testid="button-cancel-task"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              <div className="space-y-4">
                {tasksData?.tasks.map((task) => (
                  <Card key={task.id} className="p-6 hover-elevate">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-bold text-lg">{task.title}</h3>
                          <Badge variant={task.isActive ? "default" : "secondary"}>
                            {task.isActive ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                          <Badge variant="outline">{task.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="flex items-center gap-1">
                            <Wallet className="w-4 h-4 text-muted-foreground" />
                            Reward: <strong className="text-foreground">{task.reward} HA-RATE</strong>
                          </span>
                          <span className="text-muted-foreground">ID: <code className="bg-muted px-2 py-0.5 rounded text-foreground">{task.taskId}</code></span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setEditingTask(task)}
                          data-testid={`button-edit-${task.taskId}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
                              deleteTaskMutation.mutate(task.taskId);
                            }
                          }}
                          data-testid={`button-delete-${task.taskId}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {tasksData?.tasks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No tasks defined yet. Click "Add Task" to create one.</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Subscription Prices Tab */}
          <TabsContent value="prices">
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-display">Subscription Prices (USDT)</h2>
              </div>
              <form onSubmit={handlePricesSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="auto_mine" className="text-base">Auto Mine</Label>
                    <Input
                      id="auto_mine"
                      name="auto_mine"
                      type="number"
                      step="0.01"
                      defaultValue={config?.subscriptionPrices?.auto_mine || 15}
                      required
                      data-testid="input-price-auto-mine"
                      className="h-11"
                    />
                    <p className="text-sm text-muted-foreground">Monthly price for auto-mining feature</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="2x_power" className="text-base">2X Mining Power</Label>
                    <Input
                      id="2x_power"
                      name="2x_power"
                      type="number"
                      step="0.01"
                      defaultValue={config?.subscriptionPrices?.['2x_power'] || 10}
                      required
                      data-testid="input-price-2x"
                      className="h-11"
                    />
                    <p className="text-sm text-muted-foreground">Monthly price for 2x mining multiplier</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="3x_power" className="text-base">3X Mining Power</Label>
                    <Input
                      id="3x_power"
                      name="3x_power"
                      type="number"
                      step="0.01"
                      defaultValue={config?.subscriptionPrices?.['3x_power'] || 18}
                      required
                      data-testid="input-price-3x"
                      className="h-11"
                    />
                    <p className="text-sm text-muted-foreground">Monthly price for 3x mining multiplier</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="4x_power" className="text-base">4X Mining Power</Label>
                    <Input
                      id="4x_power"
                      name="4x_power"
                      type="number"
                      step="0.01"
                      defaultValue={config?.subscriptionPrices?.['4x_power'] || 23}
                      required
                      data-testid="input-price-4x"
                      className="h-11"
                    />
                    <p className="text-sm text-muted-foreground">Monthly price for 4x mining multiplier</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={updatePricesMutation.isPending}
                  data-testid="button-update-prices"
                  className="w-full md:w-auto"
                >
                  {updatePricesMutation.isPending ? 'Updating...' : 'Update Prices'}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-6">
            <WithdrawalsManagement />
          </TabsContent>

          {/* User Controls Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-display">User Controls</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 border rounded-xl hover-elevate">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">New User Registrations</h3>
                      <p className="text-sm text-muted-foreground">
                        {config?.registrationsPaused 
                          ? "New users cannot register. Existing users can still log in." 
                          : "New users can register and create accounts."}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={config?.registrationsPaused ? "destructive" : "default"} data-testid="badge-registrations-status" className="px-3 py-1">
                        {config?.registrationsPaused ? (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Paused
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </>
                        )}
                      </Badge>
                      <Button
                        variant={config?.registrationsPaused ? "default" : "destructive"}
                        onClick={() => toggleRegistrationsMutation.mutate(!config?.registrationsPaused)}
                        disabled={toggleRegistrationsMutation.isPending}
                        data-testid="button-toggle-registrations"
                      >
                        {toggleRegistrationsMutation.isPending ? 'Updating...' : (
                          config?.registrationsPaused ? 'Resume Registrations' : 'Pause Registrations'
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold mb-2">When to pause registrations?</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Database storage is nearly full and needs cleanup</li>
                      <li>System maintenance or updates are in progress</li>
                      <li>Temporary capacity limitations</li>
                      <li>Security concerns or suspicious activity detected</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-3">
                      <strong>Note:</strong> Pausing registrations only prevents new accounts from being created. 
                      Existing users can still log in, mine tokens, complete tasks, and use all platform features.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TGE Tab */}
          <TabsContent value="tge" className="space-y-6">
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Rocket className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-display">Token Generation Event (TGE)</h2>
              </div>
              
              {config?.tgeEnabled ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-5 h-5 text-primary" />
                      <h3 className="font-bold">TGE is Enabled</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      TGE was enabled on {config.tgeDate ? new Date(config.tgeDate).toLocaleString() : 'Unknown date'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      All subscriptions have been terminated and users can now withdraw their tokens.
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => {
                      if (confirm('Are you sure you want to disable TGE? This will restore normal operation but will NOT re-enable subscriptions.')) {
                        disableTGEMutation.mutate();
                      }
                    }}
                    variant="outline"
                    disabled={disableTGEMutation.isPending}
                    data-testid="button-disable-tge"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {disableTGEMutation.isPending ? 'Disabling...' : 'Disable TGE'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h3 className="font-bold mb-2">⚠️ Warning</h3>
                    <p className="text-sm text-muted-foreground">
                      Enabling TGE will:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                      <li>Immediately expire ALL active mining subscriptions</li>
                      <li>Reset all users to 1x mining power</li>
                      <li>Disable auto-mining for all users</li>
                      <li>Allow users to withdraw their HA-RATE tokens</li>
                    </ul>
                    <p className="text-sm font-bold mt-4 text-destructive">
                      This action cannot be undone!
                    </p>
                  </div>

                  {showTgePinDialog && (
                    <div className="p-4 border border-primary rounded-lg space-y-3">
                      <Label htmlFor="tge-pin">Enter PIN Code to Enable TGE</Label>
                      <Input
                        id="tge-pin"
                        type="text"
                        placeholder="Enter 6-digit PIN"
                        maxLength={6}
                        value={tgePin}
                        onChange={(e) => setTgePin(e.target.value.replace(/\D/g, ''))}
                        data-testid="input-tge-pin"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleEnableTGE}
                          variant="destructive"
                          disabled={enableTGEMutation.isPending || tgePin.length !== 6}
                          data-testid="button-confirm-enable-tge"
                        >
                          <Rocket className="w-4 h-4 mr-2" />
                          {enableTGEMutation.isPending ? 'Enabling...' : 'Confirm Enable TGE'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowTgePinDialog(false);
                            setTgePin('');
                          }}
                          variant="outline"
                          disabled={enableTGEMutation.isPending}
                          data-testid="button-cancel-tge"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {!showTgePinDialog && (
                    <Button
                      onClick={() => setShowTgePinDialog(true)}
                      variant="destructive"
                      data-testid="button-enable-tge"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Enable TGE
                    </Button>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-display">Withdrawal Settings</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 border rounded-xl hover-elevate">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Activate Withdrawals</h3>
                    <p className="text-sm text-muted-foreground">
                      {config?.withdrawalActive 
                        ? 'Users can currently withdraw their HA-RATE tokens' 
                        : 'Withdrawals are currently disabled for all users'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={config?.withdrawalActive ? "default" : "secondary"} data-testid="badge-withdrawal-status" className="px-3 py-1">
                      {config?.withdrawalActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Disabled
                        </>
                      )}
                    </Badge>
                    <Button
                      onClick={() => toggleWithdrawalMutation.mutate(!config?.withdrawalActive)}
                      disabled={toggleWithdrawalMutation.isPending}
                      variant={config?.withdrawalActive ? "destructive" : "default"}
                      data-testid="button-toggle-withdrawal"
                    >
                      {toggleWithdrawalMutation.isPending 
                        ? 'Updating...' 
                        : config?.withdrawalActive ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Withdrawals Management Component
function WithdrawalsManagement() {
  const { toast } = useToast();

  // Fetch withdrawals data
  const { data: withdrawalsData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/withdrawals'],
  });

  const withdrawals = withdrawalsData?.withdrawals || [];
  const stats = withdrawalsData?.stats || {
    total: 0,
    pending: 0,
    feeVerified: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending Fee" },
      fee_verified: { variant: "default", icon: Check, label: "Fee Verified" },
      processing: { variant: "default", icon: Clock, label: "Processing" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completed" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" }
    };

    const config = badges[status] || badges.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading withdrawals...</p>
      </Card>
    );
  }

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold" data-testid="stat-total-withdrawals">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Fee</p>
          <p className="text-2xl font-bold text-orange-500" data-testid="stat-pending-withdrawals">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Fee Verified</p>
          <p className="text-2xl font-bold text-blue-500" data-testid="stat-verified-withdrawals">{stats.feeVerified}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Processing</p>
          <p className="text-2xl font-bold text-purple-500" data-testid="stat-processing-withdrawals">{stats.processing}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-500" data-testid="stat-completed-withdrawals">{stats.completed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-red-500" data-testid="stat-failed-withdrawals">{stats.failed}</p>
        </Card>
      </div>

      {/* Withdrawals Table */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Recent Withdrawals</h2>
        
        {withdrawals.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No withdrawals yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Fee</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Tx Hashes</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal: any) => (
                  <tr key={withdrawal._id} className="border-b hover-elevate" data-testid={`withdrawal-row-${withdrawal._id}`}>
                    <td className="p-3">
                      <div className="font-mono text-xs">
                        {withdrawal.walletAddress?.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold">{withdrawal.amount} HA-RATE</div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {withdrawal.feeExpected} TON
                        {withdrawal.feePaid && <Check className="inline w-4 h-4 ml-1 text-green-500" />}
                      </div>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(withdrawal.status)}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(withdrawal.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1 text-xs">
                        {withdrawal.feeTxHash && (
                          <div className="font-mono text-green-600">
                            Fee: {withdrawal.feeTxHash.substring(0, 8)}...
                          </div>
                        )}
                        {withdrawal.coinTxHash && (
                          <div className="font-mono text-blue-600">
                            Coin: {withdrawal.coinTxHash.substring(0, 8)}...
                          </div>
                        )}
                        {!withdrawal.feeTxHash && !withdrawal.coinTxHash && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-bold mb-2">ℹ️ Automatic Withdrawal System</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Withdrawals are processed automatically by the FastAPI microservice:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li><strong>Pending Fee:</strong> User created withdrawal, waiting for fee payment</li>
          <li><strong>Fee Verified:</strong> Fee payment detected on blockchain, ready to send coins</li>
          <li><strong>Processing:</strong> Sending coins to user wallet</li>
          <li><strong>Completed:</strong> Coins successfully sent</li>
          <li><strong>Failed:</strong> Error occurred, user balance refunded</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          The cron job checks for fees and processes withdrawals every minute automatically.
        </p>
      </Card>
    </>
  );
}
