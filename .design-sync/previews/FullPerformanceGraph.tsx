import { FullPerformanceGraph } from "gitgud";

const month = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const possible = 250 + ((i * 53) % 150);
  const earned = Math.round(possible * (0.45 + 0.5 * Math.abs(Math.sin(i / 4))));
  return { date, totalXP: earned, possibleXP: possible, tasksDone: 2 + (i % 5) };
});

export const PerformanceLog = () => <FullPerformanceGraph dayLogs={month} onClose={() => {}} />;
