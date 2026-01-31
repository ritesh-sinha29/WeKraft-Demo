"use server";

import { auth } from "@clerk/nextjs/server";
import { fetchUserContributions, getGithubAccessToken } from "../github/action";
import { Octokit } from "octokit";

// =====================================
// GETTING DASHBOARD STATS (count of all)
// =====================================
export async function getDahboardStats(githubName: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const accessToken = await getGithubAccessToken();
    console.log("Getting access Token to display stats on Dashboard");
    const calendar = await fetchUserContributions(accessToken, githubName);
    const totalCommits = calendar?.totalContributions || 0;
    const octokit = new Octokit({ auth: accessToken });

    // Count PRs from github
    const { data: pr } = await octokit.rest.search.issuesAndPullRequests({
      q: `author:${githubName} type:pr`,
      per_page: 1,
    });
    const totalpr = pr?.total_count || 0;

    // Count MERGED PRs
    const { data: mergedPR } = await octokit.rest.search.issuesAndPullRequests({
      q: `author:${githubName} type:pr is:merged`,
      per_page: 1,
    });
    const totalMergedPRs = mergedPR?.total_count || 0;

    // Count closed issues
    const { data: issues } = await octokit.rest.search.issuesAndPullRequests({
      q: `author:${githubName} type:issue is:closed`,
      per_page: 1,
    });
    const totalIssuesClosed = issues?.total_count || 0;

    // Count OPEN issues
    const { data: openIssues } =
      await octokit.rest.search.issuesAndPullRequests({
        q: `author:${githubName} type:issue is:open`,
        per_page: 1,
      });
    const totalOpenIssues = openIssues?.total_count || 0;

    // Count code review comments
    const { data: reviews } = await octokit.rest.search.issuesAndPullRequests({
      q: `commenter:${githubName} type:pr`,
      per_page: 1,
    });
    const totalReviews = reviews?.total_count || 0;

    // Get user account creation date for age calculation
    const { data: user } = await octokit.rest.users.getByUsername({
      username: githubName,
    });
    const accountCreatedAt = new Date(user.created_at);
    const accountAgeInYears =
      (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 365);

    return {
      totalCommits,
      totalPRs: totalpr,
      totalMergedPRs, 
      totalIssuesClosed,
      totalOpenIssues, 
      totalReviews,
      accountAgeInYears,
      accountCreatedAt: user.created_at,
    };
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch dashboard stats");
  }
}

// ==================================
// GET HEATMAPS CONTRIBUTION
// ==================================
export async function getContributionStats(githubName: string, year?: number) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const accessToken = await getGithubAccessToken();
    console.log("accessToken", accessToken);

    let from: string | undefined;
    let to: string | undefined;

    if (year) {
      from = `${year}-01-01T00:00:00Z`;
      to = `${year}-12-31T23:59:59Z`;
    }

    // Need to remove ronitrai27
    const calendar = await fetchUserContributions(
      accessToken,
      githubName,
      from,
      to
    );
    // console.log("calendar", calendar);

    // ==========================================
    // CALCULATE LIFETIME CONTRIBUTIONS
    // ==========================================
    // 2. Fetch total for every year
    let creationYear = new Date().getFullYear();
    try {
      const octokit = new Octokit({ auth: accessToken });
      const { data: user } = await octokit.rest.users.getByUsername({
        username: githubName,
      });
      if (user.created_at) {
        creationYear = new Date(user.created_at).getFullYear();
      }
    } catch (e) {
      // console.error("Failed to fetch creation year, using current year", e);
    }
    
    const currentYear = new Date().getFullYear();

    const yearPromises = [];
    for (let y = creationYear; y <= currentYear; y++) {
      yearPromises.push(
        fetchUserContributions(
          accessToken,
          githubName,
          `${y}-01-01T00:00:00Z`,
          `${y}-12-31T23:59:59Z`
        )
      );
    }

    const yearlyCalendars = await Promise.all(yearPromises);
    const lifetimeTotal = yearlyCalendars.reduce(
      (sum, cal) => sum + (cal?.totalContributions || 0),
      0
    );

    if (!calendar) {
      return {
        contributions: [],
        totalContributions: 0,
        lifetimeTotal: 0,
      };
    }

    const contributions = calendar.weeks.flatMap((week: any) =>
      week.contributionDays.map((day: any) => ({
        date: day.date,
        count: day.contributionCount,
        level: Math.min(4, Math.floor(day.contributionCount / 3)),
      }))
    );
    // console.log("contributions", contributions);
    return {
      contributions,
      totalContributions: calendar.totalContributions,
      lifetimeTotal,
      creationYear,
    };
  } catch (error) {
    console.log(error);
    return {
      contributions: [],
      totalContributions: 0,
      lifetimeTotal: 0,
      creationYear: new Date().getFullYear(),
    };
  }
}

// ====================================
// GET 6 MONTHS DATA
// =====================================
// 👉 Its purpose is to build a 6-month activity summary for a logged-in user, combining:
// ✅ Commits (from GitHub contributions calendar)
// ✅ Pull Requests created
// ⚠️ Code reviews (currently fake/sample data)
export async function getMonthlyActivity() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const accessToken = await getGithubAccessToken();
    // console.log("accessToken", accessToken);
    const octokit = new Octokit({ auth: accessToken });

    const { data: user } = await octokit.rest.users.getAuthenticated();

    console.log("Fetching 6 motnhs activity for dashboard...");
    const calendar = await fetchUserContributions(accessToken!, user.login);

    if (!calendar) {
      return [];
    }
    const monthlyData: {
      [key: string]: { commits: number; prs: number; reviews: number };
    } = {};

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthNames[date.getMonth()];
      monthlyData[monthKey] = { commits: 0, prs: 0, reviews: 0 };
    }

    calendar.weeks.forEach((week: any) => {
      week.contributionDays.forEach((day: any) => {
        const date = new Date(day.date);
        const monthKey = monthNames[date.getMonth()];
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].commits += day.contributionCount;
        }
      });
    });

    // Fetch reviews from database for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // TODO: REVIEWS'S REAL DATA
    const generateSampleReviews = () => {
      const sampleReviews = [];
      const now = new Date();

      // Generate random reviews over the past 6 months
      for (let i = 0; i < 45; i++) {
        const randomDaysAgo = Math.floor(Math.random() * 180); // Random day in last 6 months
        const reviewDate = new Date(now);
        reviewDate.setDate(reviewDate.getDate() - randomDaysAgo);

        sampleReviews.push({
          createdAt: reviewDate,
        });
      }

      return sampleReviews;
    };

    const reviews = generateSampleReviews();

    reviews.forEach((review) => {
      const monthKey = monthNames[review.createdAt.getMonth()];
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].reviews += 1;
      }
    });

    const { data: prs } = await octokit.rest.search.issuesAndPullRequests({
      q: `author:${user.login} type:pr created:>${
        sixMonthsAgo.toISOString().split("T")[0]
      }`,
      per_page: 100,
    });

    prs.items.forEach((pr: any) => {
      const date = new Date(pr.created_at);
      const monthKey = monthNames[date.getMonth()];
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].prs += 1;
      }
    });

    return Object.keys(monthlyData).map((name) => ({
      name,
      ...monthlyData[name],
    }));
  } catch (error) {
    console.error("Error fetching monthly activity:", error);
    return [];
  }
}
