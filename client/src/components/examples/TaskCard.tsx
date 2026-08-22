import TaskCard from '../TaskCard';

export default function TaskCardExample() {
  return (
    <TaskCard
      id="daily-login"
      title="Daily Login Streak"
      description="Log in for 7 consecutive days to earn bonus tokens"
      reward={500}
      progress={5}
      total={7}
      timeLeft="2d 14h"
    />
  );
}