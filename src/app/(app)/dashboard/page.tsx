import { StatsCards } from "./components/stats-cards";
import { TasksByStatusChart } from "./components/tasks-by-status-chart";
import { TasksByPriorityChart } from "./components/tasks-by-priority-chart";
import { RecentActivity } from "./components/recent-activity";
import { UpcomingDeadlines } from "./components/upcoming-deadlines";
import { TeamWorkload } from "./components/team-workload";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-[1920px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>

        {/* STATS GRID 
           - Mobile: 2 columns (Compact)
           - Tablet: 3 columns
           - Desktop: 6 columns
        */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            <StatsCards />
        </div>

        {/* MAIN CONTENT GRID
           - Stacked on Mobile
           - Side-by-side on Large Desktop
        */}
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-6">
            
            {/* Left Column: Recent Activity (Takes more space on Desktop) */}
            <div className="xl:col-span-4 min-w-0">
                <RecentActivity />
            </div>

            {/* Right Column: Deadlines & Workload */}
            <div className="xl:col-span-3 grid gap-6">
                <UpcomingDeadlines />
                <TeamWorkload />
            </div>
        </div>

        {/* CHARTS GRID 
           - 'min-w-0' is CRITICAL here. It prevents charts from overflowing 
             the grid container on mobile, fixing the "Labels out of screen" issue.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-6">
            <div className="xl:col-span-4 min-w-0">
              <TasksByPriorityChart />
            </div>
            <div className="xl:col-span-3 min-w-0">
              <TasksByStatusChart />
            </div>
        </div>
    </div>
  )
}