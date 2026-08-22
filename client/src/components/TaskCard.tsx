import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress?: number;
  total?: number;
  timeLeft?: string;
  completed?: boolean;
  link?: string;
}

export default function TaskCard({ id, title, description, reward, progress = 0, total = 1, timeLeft, completed = false, link }: TaskCardProps) {
  const { toast } = useToast();
  const isCompleted = completed;
  const percentage = total > 0 ? (progress / total) * 100 : 0;

  const completeMutation = useMutation({
    mutationFn: () => apiRequest('/api/tasks/update', 'POST', {
      taskId: id,
      progress: total,
      completed: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      toast({
        title: "Task Completed!",
        description: `You earned ${reward} HA-RATE tokens`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to complete task",
        description: error.message || "Unable to complete task",
        variant: "destructive",
      });
    },
  });

  const handleClaim = () => {
    completeMutation.mutate();
  };

  const handleFollow = () => {
    if (link) {
      // Open link in new tab with security features
      window.open(link, '_blank', 'noopener,noreferrer');
      // Auto-complete the task
      completeMutation.mutate();
    }
  };

  return (
    <Card className={`${isCompleted ? 'bg-chart-3/5 border-chart-3/30' : ''} hover-elevate transition-all`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isCompleted ? 'bg-chart-3 text-white' : 'bg-primary/10 text-primary'
          }`}>
            {isCompleted ? (
              <Check className="w-5 h-5" />
            ) : (
              <span className="font-bold">{progress}/{total}</span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold" data-testid={`text-task-${id}`}>{title}</h4>
              {timeLeft && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {timeLeft}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{description}</p>
            
            {!isCompleted && total > 1 && (
              <div className="mb-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-primary">+{reward.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">Mizorate</span>
              </div>
              <Button 
                size="sm" 
                disabled={completeMutation.isPending}
                onClick={link ? handleFollow : handleClaim}
                data-testid={`button-${link ? 'follow' : 'claim'}-task-${id}`}
              >
                {completeMutation.isPending ? (link ? 'Opening...' : 'Claiming...') : isCompleted ? (link ? 'Complete' : 'Done') : (link ? 'Follow' : 'Claim')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
