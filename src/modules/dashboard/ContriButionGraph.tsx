/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import { ActivityCalendar } from "react-activity-calendar";
import { useTheme } from "next-themes";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getContributionStats } from ".";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ContributionGraph = () => {
  const { theme } = useTheme();
  const [selectedYear, setSelectedYear] = React.useState<number>(
    new Date().getFullYear()
  );

  const user = useConvexQuery(api.users.getCurrentUser);
  const userName = user?.githubUsername;

  // Generate years list (e.g., last 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const { data, isLoading } = useQuery<{
    contributions: any[];
    totalContributions: number;
    lifetimeTotal: number;
    creationYear: number;
  }>({
    queryKey: ["contribution-graph", selectedYear], // Add selectedYear to queryKey
    queryFn: () => getContributionStats(userName || "", selectedYear) as any,
    enabled: !!userName,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data || !data?.contributions?.length) {
    return (
      <div>
        <h1>No contribution data available</h1>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between px-4">
        <div className="text-muted-foreground text-sm">
          <span>
            {(data?.lifetimeTotal ?? data?.totalContributions)?.toLocaleString()} contributions {data?.creationYear ? `since ${data.creationYear}` : ""}
          </span>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-transparent text-sm text-foreground border rounded px-2 py-1 outline-none cursor-pointer"
        >
          {years.map((year) => (
            <option key={year} value={year} className="bg-background">
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <div
          className="scrollbar-hide flex justify-center overflow-x-auto scale-100 2xl:scale-105"
          style={{
            width: "100%",
            transformOrigin: "center",
          }}
        >
          <ActivityCalendar
            data={data?.contributions}
            theme={{
              light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
              dark: ["#161b22", "#255c35", "#3dae58", "#4cd36a", "#5ef87f"],
            }}
            colorScheme={theme === "dark" ? "dark" : "light"}
            blockSize={12}
            blockMargin={3} // GitHub uses tighter spacing
            blockRadius={2} // GitHub uses slightly rounded squares
            fontSize={14}
            showWeekdayLabels={false} // Enable labels like GitHub
            showColorLegend={false} // Match GitHub's footer legend
            showTotalCount // We handle total count separately
            showMonthLabels
            renderBlock={(block, activity) => (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {block}
                  </TooltipTrigger>
                  <TooltipContent>
                    {activity.count} commits on {activity.date}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default ContributionGraph;
