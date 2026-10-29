const fs = require('fs');
const path = require('path');

const files = [
  path.resolve(__dirname, '../src/data/kaizoLevels.json'),
  path.resolve(__dirname, '../public/data/kaizo_list.json')
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.forEach(lvl => {
    if (lvl.rank === 2) {
      lvl.thumbnailUrl = '/src/assets/images/second_crucible.png';
    } else if (lvl.rank === 3) {
      lvl.thumbnailUrl = '/src/assets/images/fluorescence.png';
    } else if (lvl.rank === 4) {
      lvl.thumbnailUrl = '/src/assets/images/frozen_galaxy.png';
    } else if (lvl.rank === 5) {
      lvl.thumbnailUrl = '/src/assets/images/bullet_hell.png';
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated thumbnails in ${filePath}`);
});
