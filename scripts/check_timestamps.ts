import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkTimestamps() {
  const snap = await getDocs(collection(db, 'image_chunks'));
  const list = snap.docs.map(d => ({
    id: d.id,
    updatedAt: d.data().updatedAt,
    count: Object.keys(d.data().images || {}).length
  })).sort((a, b) => parseInt(a.id.replace('chunk-', '')) - parseInt(b.id.replace('chunk-', '')));

  list.forEach(item => {
    console.log(`${item.id}: count=${item.count}, updatedAt=${item.updatedAt}`);
  });
  process.exit(0);
}

checkTimestamps().catch(console.error);
