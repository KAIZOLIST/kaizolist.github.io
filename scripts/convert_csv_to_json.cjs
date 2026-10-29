const fs = require('fs');
const path = require('path');

// Read the CSV
const csvPath = path.resolve(__dirname, '../public/assets/aistudio/Goober_Dash_Kaizo_List_-_Verified_Levels_b5c63782.csv');
const rawContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV lines respecting quotes
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);

// Find header row starting with "#,Levels"
let headerRowIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('#,Levels') || lines[i].startsWith('#,Levels,Points')) {
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex === -1) {
  console.error('Header row not found');
  process.exit(1);
}

const headerCols = parseCsvLine(lines[headerRowIndex]);
// Player names are from column index 5 up to second-to-last (or index of "# of Kaizo Clears" - 1)
const clearsColIndex = headerCols.indexOf('# of Kaizo Clears');
const playerCols = headerCols.slice(5, clearsColIndex > 0 ? clearsColIndex : undefined);

console.log(`Detected ${playerCols.length} players: ${playerCols.slice(0, 5).join(', ')}...`);

const levels = [];

for (let i = headerRowIndex + 1; i < lines.length; i++) {
  const line = lines[i];
  const cols = parseCsvLine(line);
  const rankStr = cols[0];
  const rawLevelName = cols[1];

  if (!rankStr || isNaN(Number(rankStr))) {
    // If we hit non-rank row, check if it's madden 19 or stop
    continue;
  }

  const rank = Number(rankStr);
  const points = parseFloat(cols[2]) || 1;
  const verifier = cols[3] || 'Unknown';
  const worldRecord = cols[4] || '-';

  // Split level name and creator
  let name = rawLevelName;
  let creator = 'Unknown';
  if (rawLevelName.includes(' by ')) {
    const parts = rawLevelName.split(' by ');
    name = parts[0].trim();
    creator = parts.slice(1).join(' by ').trim();
  } else if (rawLevelName.startsWith('by ')) {
    name = 'Untitled';
    creator = rawLevelName.replace(/^by\s+/, '').trim();
  }

  if (!name) name = `Level #${rank}`;

  // Difficulty Tier
  let difficulty = 'Entry Kaizo';
  if (points >= 200) difficulty = 'Extreme Kaizo';
  else if (points >= 100) difficulty = 'Insane Kaizo';
  else if (points >= 40) difficulty = 'High Kaizo';
  else if (points >= 10) difficulty = 'Mid Kaizo';

  // WR Holders list for checking
  const wrHolders = worldRecord.split(',').map(s => s.trim().toLowerCase());

  // Find all victors for this level
  const victors = [];
  
  // First, check if verifier is among players or add verifier as first victor
  let verifierAdded = false;

  playerCols.forEach((playerName, pIdx) => {
    const colIdx = 5 + pIdx;
    const val = cols[colIdx];
    if (val && val.toUpperCase() === 'TRUE') {
      const isVerifier = playerName.toLowerCase() === verifier.toLowerCase();
      const isWR = wrHolders.some(wr => wr === playerName.toLowerCase());
      
      let note = '';
      if (isVerifier && isWR) note = 'Verifier & World Record Holder (+25% bonus pts)';
      else if (isVerifier) note = 'Official Verifier (+10% bonus pts)';
      else if (isWR) note = 'World Record Holder (+15% bonus pts)';

      victors.push({
        id: `vic-${rank}-${playerName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        name: playerName,
        completionDate: '2026',
        videoProofUrl: 'https://gooberdash.winterpixel.io/',
        notes: note || undefined,
        verifiedByCreator: true,
        isVerifier,
        isWorldRecord: isWR
      });

      if (isVerifier) verifierAdded = true;
    }
  });

  // Sort victors: Verifier first, then WR, then others alphabetically
  victors.sort((a, b) => {
    if (a.isVerifier && !b.isVerifier) return -1;
    if (!a.isVerifier && b.isVerifier) return 1;
    if (a.isWorldRecord && !b.isWorldRecord) return -1;
    if (!a.isWorldRecord && b.isWorldRecord) return 1;
    return a.name.localeCompare(b.name);
  });

  // Level code
  const codeSuffix = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5) || 'LVL';
  const levelCode = `GB-${1000 + rank}-${codeSuffix}`;

  levels.push({
    id: `level-${rank}`,
    rank,
    name,
    creator,
    verifier,
    worldRecord,
    levelCode,
    directPlayUrl: `https://gooberdash.winterpixel.io/`,
    difficulty,
    points,
    thumbnailUrl: null, // User can assign thumbnails
    description: `Official Goober Dash Kaizo rating #${rank}. Points: ${points}. Verifier: ${verifier}. World Record: ${worldRecord}. Total verified completions: ${victors.length}.`,
    length: points >= 100 ? '0:50' : '0:35',
    releaseDate: '2026-01-01',
    victors
  });

  // Stop after level 230 ("madden 19")
  if (rank === 230) {
    break;
  }
}

console.log(`Parsed ${levels.length} total levels!`);

// Save to src/data/kaizoLevels.json
const outPath = path.resolve(__dirname, '../src/data/kaizoLevels.json');
fs.writeFileSync(outPath, JSON.stringify(levels, null, 2), 'utf8');

// Also save to public/data/kaizo_list.json
const publicOutPath = path.resolve(__dirname, '../public/data/kaizo_list.json');
fs.writeFileSync(publicOutPath, JSON.stringify(levels, null, 2), 'utf8');

console.log(`Successfully wrote ${levels.length} levels to src/data/kaizoLevels.json and public/data/kaizo_list.json!`);
