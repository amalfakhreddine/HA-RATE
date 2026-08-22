import { useQuery } from "@tanstack/react-query";
import TaskCard from "@/components/TaskCard";

interface TaskData {
  taskId: string;
  progress: number;
  completed: boolean;
}

export default function TasksPage() {
  const { data: tasks = [] } = useQuery<TaskData[]>({
    queryKey: ['/api/tasks'],
  });

  const taskDefinitions = [
    {
      id: "daily-login",
      title: "Daily Login",
      description: "Claim your daily login reward",
      reward: 0.2,
      total: 1
    },
    {
      id: "follow-x",
      title: "Follow on X",
      description: "Follow our official X account",
      reward: 0.2,
      total: 1,
      link: "https://x.com/bittnexis?s=21"
    },
  ];

  const mergedTasks = taskDefinitions.map(def => {
    const backendTask = tasks.find((t: TaskData) => t.taskId === def.id);
    return {
      ...def,
      progress: backendTask?.progress || 0,
      completed: backendTask?.completed || false,
    };
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-display mb-2" data-testid="text-tasks-page-title">Daily Tasks & Challenges</h1>
          <p className="text-muted-foreground text-lg">Complete tasks to earn HA-RATE rewards</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {mergedTasks.map((task) => (
            <TaskCard key={task.id} {...task} />
          ))}
        </div>
      </main>
    </div>
  );
}
