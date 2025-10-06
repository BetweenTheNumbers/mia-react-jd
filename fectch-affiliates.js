const fetch = require('node-fetch');
const fs = require('fs');

const teamIds = [146, 144, 4124, 554, 479, 467, 3277, 2127]; // Verified IDs for Marlins affiliates
const affiliates = [];

async function fetchTeams() {
  for (const id of teamIds) {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/teams/${id}`);
      const json = await res.json();
      const team = json.teams[0];
      let level = 'Unknown';
      if (team.league?.id === 103 || team.league?.id === 104) level = 'MLB';
      else if (team.league?.id === 11 || team.league?.id === 12) level = 'AAA';
      else if (team.league?.id === 13) level = 'AA';
      else if (team.league?.id === 14) level = 'A+';
      else if (team.league?.id === 16) level = 'A';
      else if (team.league?.id === 21) {
        if (team.name.includes('DSL')) level = team.id === 3277 ? 'Rookie (DSL 1)' : 'Rookie (DSL 2)';
        else level = 'Rookie (FCL)';
      }
      affiliates.push({
        id: team.id,
        name: team.name,
        level,
        parentOrgId: team.parentOrgId || null,
      });
    } catch (error) {
      console.error(`Error fetching team ${id}:`, error);
    }
  }
  fs.writeFileSync('src/affiliates.json', JSON.stringify(affiliates, null, 2));
  console.log('Generated src/affiliates.json');
}

fetchTeams();