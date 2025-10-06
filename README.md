# mia-react-jd

# Marlins Schedule App

This is a React application that displays the schedule and results for the Miami Marlins and their minor league affiliates, using the MLB Stats API (`https://statsapi.mlb.com`). It shows game scores, opponent details, and game status for a selected date, with a date picker defaulting to the current date (uploaded 2025/10/06).

## Features
- Displays affiliate level (e.g., "MLB", "AAA") for Marlins and affiliates.
- Shows games as "Away Score - Home Score" (e.g., "3 - 2 Final") with boxscore fallback for missing scores.
- Displays opponents as "Away Team @ Home Team" (e.g., "New York Yankees @ Miami Marlins").
- For non-MLB affiliates, attempts to show parent team in parentheses (e.g., "Birmingham Barons (Chicago White Sox) @ Pensacola Blue Wahoos").
- Shows winning/losing pitcher (e.g., "WP: Max Fried, LP: Zack Wheeler").
- Orders affiliates: MLB, AAA, AA, A+, A, Rookie (FCL), Rookie (DSL 1), Rookie (DSL 2).
- Uses `react-datepicker` for date selection, defaulting to today.
- Console logs (F12) show API responses and score details.

## Limitations
The app attempts to display parent affiliations for non-MLB opponent teams using the MLB Stats API (`/api/v1/teams?sportIds=1,11,12,13,14,16,21`). However, this feature did not work reliably due to issues with on-demand `/api/v1/teams/{teamId}` lookups, which caused rendering problems (e.g., page not loading due to unhandled async promises). The current implementation uses a pre-fetched `teamsMap` for parent names, but some parent affiliations may be missing if not in the initial API response. Ideally, parent affiliation data should be retrieved periodically (e.g., daily or weekly) from the `/api/v1/teams` endpoint and stored locally in a JSON file (e.g., `src/teams.json`) to avoid repeated API calls for every schedule pull, reducing latency and API usage.

## Prerequisites
- Node.js (v16+)
- npm
- Vite

## Setup
1. Clone or unzip the project into your local environment or Codespace (`/workspaces/mia-react-jd`).
2. Install dependencies:
   ```bash
   npm install
   npm install react-datepicker date-fns