import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './index.css';

interface Team {
  id: number;
  name: string;
  parentOrgId?: number;
  parentOrgName?: string;
  score?: number;
}

interface Game {
  gamePk: number;
  gameDate: string;
  teams: {
    away: { team: Team };
    home: { team: Team };
  };
  status: { abstractGameState: 'Preview' | 'Live' | 'Final'; startTime: string };
  venue: { name: string };
  linescore?: {
    currentInning?: number;
    currentInningOrdinal?: string;
    outs?: number;
    baseRunners?: { base: number }[];
  };
  decisions?: {
    winner?: { fullName: string };
    loser?: { fullName: string };
    save?: { fullName: string };
  };
  probablePitchers?: {
    home?: { fullName: string };
    away?: { fullName: string };
  };
  gameInfo?: {
    currentBatter?: { fullName: string };
    currentPitcher?: { fullName: string };
  };
}

interface ScheduleResponse {
  dates: { games: Game[] }[];
}

interface BoxscoreResponse {
  teams: {
    home: { teamStats: { batting: { runs: number } } };
    away: { teamStats: { batting: { runs: number } } };
  };
}

interface Affiliate {
  id: number;
  name: string;
  level: string;
}

const LEVEL_ORDER = {
  MLB: 0,
  AAA: 1,
  AA: 2,
  'A+': 3,
  A: 4,
  'Rookie (FCL)': 5,
  'Rookie (DSL 1)': 6,
  'Rookie (DSL 2)': 7,
};

const INITIAL_AFFILIATES: Affiliate[] = [
  { id: 146, name: 'Miami Marlins', level: 'MLB' },
  { id: 619, name: 'Jacksonville Jumbo Shrimp', level: 'AAA' },
  { id: 479, name: 'Pensacola Blue Wahoos', level: 'AA' },
  { id: 564, name: 'Beloit Sky Carp', level: 'A+' },
  { id: 554, name: 'Jupiter Hammerheads', level: 'A' },
  { id: 3276, name: 'FCL Marlins', level: 'Rookie (FCL)' },
  { id: 3277, name: 'DSL Miami', level: 'Rookie (DSL 1)' },
  { id: 2127, name: 'DSL Marlins', level: 'Rookie (DSL 2)' },
];

const SPORT_IDS = [1, 11, 12, 13, 14, 16, 21];
const BASE_URL = 'https://statsapi.mlb.com/api/v1/schedule';
const TEAMS_URL = `https://statsapi.mlb.com/api/v1/teams?sportIds=${SPORT_IDS.join(',')}`;

function App() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to October 6, 2025
  const [data, setData] = useState<{ [key: number]: Game | null }>({});
  const [teamsMap, setTeamsMap] = useState<{ [key: number]: string }>({});
  const [affiliates, setAffiliates] = useState<Affiliate[]>(INITIAL_AFFILIATES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch team data for affiliates (name only) and opponent parent mapping
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(TEAMS_URL);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const json = await res.json();
        const mlbTeams: { [key: number]: string } = {};
        const updatedAffiliates = [...INITIAL_AFFILIATES];
        json.teams.forEach((team: Team) => {
          if (team.id && team.name) {
            mlbTeams[team.id] = team.name;
            const affiliateIndex = updatedAffiliates.findIndex(aff => aff.id === team.id);
            if (affiliateIndex !== -1 && (team.parentOrgId === 146 || team.id === 146)) {
              updatedAffiliates[affiliateIndex] = {
                ...updatedAffiliates[affiliateIndex],
                name: team.name, // Update name only, keep level
              };
            }
          }
        });
        setTeamsMap(mlbTeams);
        setAffiliates(updatedAffiliates.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load team data.');
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (!date || Object.keys(teamsMap).length === 0) return;
    fetchSchedule(date);
  }, [date, teamsMap]);

  const fetchSchedule = async (selectedDate: string) => {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    affiliates.forEach(aff => params.append('teamId', aff.id.toString()));
    SPORT_IDS.forEach(id => params.append('sportId', id.toString()));
    params.append('date', selectedDate);
    params.append('hydrate', 'linescore,decisions,probablePitchers,gameInfo');
    const url = `${BASE_URL}?${params}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const json: ScheduleResponse = await res.json();
      console.log('API Response:', JSON.stringify(json, null, 2));
      const games = json.dates[0]?.games || [];
      const affiliateData: { [key: number]: Game | null } = {};
      for (const aff of affiliates) {
        const game = games.find(g => g.teams.away.team.id === aff.id || g.teams.home.team.id === aff.id) || null;
        affiliateData[aff.id] = game;
        if (game) {
          console.log(`Scores for ${aff.name} (ID: ${aff.id}): Home=${game.teams.home.score ?? 'N/A'}, Away=${game.teams.away.score ?? 'N/A'}`);
          if ((game.teams.home.score === undefined || game.teams.away.score === undefined) && game.status.abstractGameState !== 'Preview') {
            const boxscore = await fetchBoxscore(game.gamePk);
            game.teams.home.score = boxscore.homeScore;
            game.teams.away.score = boxscore.awayScore;
            console.log(`Boxscore fallback for ${aff.name}: Home=${boxscore.homeScore}, Away=${boxscore.awayScore}`);
          }
        }
      }
      setData(affiliateData);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('Failed to load schedule. Please try another date.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoxscore = async (gamePk: number) => {
    try {
      const url = `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const json: BoxscoreResponse = await res.json();
      return {
        homeScore: json.teams.home.teamStats.batting.runs || 0,
        awayScore: json.teams.away.teamStats.batting.runs || 0,
      };
    } catch (error) {
      console.error(`Error fetching boxscore for game ${gamePk}:`, error);
      return { homeScore: 0, awayScore: 0 };
    }
  };

  const getOpponentParent = (team: Team, affiliateLevel: string): string => {
    if (affiliateLevel === 'MLB') return '';
    const parentId = team.parentOrgId;
    return parentId && teamsMap[parentId] ? teamsMap[parentId] : '';
  };

  const getGameState = (game: Game | null, affiliateId: number) => {
    if (!game) return { state: 'NO GAME', details: '', opponent: '', venue: '', homeScore: 0, awayScore: 0, level: '', opponentParent: '' };

    const { status, teams, venue, linescore, decisions, probablePitchers, gameInfo } = game;
    const isHome = teams.home.team.id === affiliateId;
    const affiliateLevel = affiliates.find(aff => aff.id === affiliateId)?.level || 'Unknown';
    const opponentTeam = isHome ? teams.away.team : teams.home.team;
    const opponentParent = getOpponentParent(opponentTeam, affiliateLevel);
    const opponent = `${teams.away.team.name} @ ${teams.home.team.name}`;
    const homeScore = teams.home.score ?? 0;
    const awayScore = teams.away.score ?? 0;
    const time = status.startTime ? new Date(status.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBR';

    let state = '', details = '';
    if (status.abstractGameState === 'Preview') {
      state = time;
      const sp = probablePitchers ? (isHome ? probablePitchers.home?.fullName : probablePitchers.away?.fullName) || 'TBD' : 'TBD';
      details = `SP: ${sp}`;
    } else if (status.abstractGameState === 'Live') {
      const runners = linescore?.baseRunners?.length ? `Runners on: ${linescore.baseRunners.map(r => r.base).join(', ')}` : 'No runners';
      const batter = gameInfo?.currentBatter?.fullName || 'TBD';
      const pitcher = gameInfo?.currentPitcher?.fullName || 'TBD';
      state = `${linescore?.currentInningOrdinal || 'Top 1'} ${linescore?.outs ?? 0} outs`;
      details = `Batter: ${batter}, Pitcher: ${pitcher}, ${runners}`;
    } else {
      state = 'Final';
      const wp = decisions?.winner?.fullName || 'TBD';
      const lp = decisions?.loser?.fullName || 'TBD';
      const sv = decisions?.save?.fullName || 'None';
      details = `WP: ${wp}, LP: ${lp}, SV: ${sv}`;
    }
    return {
      state,
      details,
      opponent,
      venue: venue.name,
      homeScore,
      awayScore,
      level: affiliateLevel,
      opponentParent,
    };
  };

  const handleDateChange = (selectedDate: Date | null) => {
    if (selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
      setError(null);
    } else {
      setDate(null);
    }
  };

  const handlePrevDay = () => {
    if (!date) return;
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    setDate(prevDate.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (!date) return;
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    setDate(nextDate.toISOString().split('T')[0]);
  };

  if (loading) return <div className="app"><p>Loading team data...</p></div>;

  return (
    <div className="app">
      <h1>Marlins & Affiliates Schedule and Results</h1>
      <div className="date-header">
        <button onClick={handlePrevDay} disabled={!date}>&lt;</button>
        <span className="date-label">
          {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
        </span>
        <button onClick={handleNextDay} disabled={!date}>&gt;</button>
      </div>
      <DatePicker
        selected={date ? new Date(date) : null}
        onChange={handleDateChange}
        dateFormat="yyyy-MM-dd"
        placeholderText="Select a date"
        className="date-picker"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
      />
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      <div className="tiles">
        {affiliates.map(aff => {
          const game = data[aff.id];
          const { state, details, opponent, venue, homeScore, awayScore, level, opponentParent } = getGameState(game, aff.id);
          return (
            <div key={aff.id} className="tile">
              <div className="game-info">
                <span className="team">{level}</span>
                {game ? (
                  <>
                    <span className="opponent">{opponent} {opponentParent ? `(${opponentParent})` : ''}</span>
                    {state !== 'NO GAME' && (
                      <span className="score">
                        <strong>{awayScore} - {homeScore}</strong> {state}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="score">NO GAME</span>
                )}
              </div>
              {game && (
                <div className="game-details">
                  <p>{details}</p>
                  <p className="venue">{venue}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;