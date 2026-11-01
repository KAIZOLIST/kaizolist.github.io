import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkAll() {
  const bundleSnap = await getDoc(doc(db, 'bundles', 'levels'));
  const levels = bundleSnap.data()?.levels || [];
  const levelById = new Map();
  levels.forEach((l: any) => levelById.set(l.id, l));

  const chunksSnap = await getDocs(collection(db, 'image_chunks'));
  
  // Sort chunks numerically: chunk-0, chunk-1, ..., chunk-25
  const sortedDocs = [...chunksSnap.docs].sort((a, b) => {
    const numA = parseInt(a.id.replace('chunk-', ''), 10);
    const numB = parseInt(b.id.replace('chunk-', ''), 10);
    return numA - numB;
  });

  for (const c of sortedDocs) {
    const data = c.data();
    const imgs = data.images || {};
    const count = Object.keys(imgs).length;
    if (count > 0) {
      console.log(`\n=== ${c.id} (${count} images) ===`);
      for (const [id, url] of Object.entries(imgs)) {
        const lvl = levelById.get(id);
        const urlStr = url as string;
        console.log(`  Rank #${lvl?.rank} - ${lvl?.name} (id: ${id}, type: ${urlStr.startsWith('data:') ? 'base64' : 'url'}, len: ${urlStr.length})`);
      }
    }
  }
  process.exit(0);
}

checkAll().catch(console.error);
