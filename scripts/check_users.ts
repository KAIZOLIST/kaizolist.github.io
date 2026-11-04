import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  console.log('Users collection docs count:', snapshot.size);
  snapshot.forEach(docSnap => {
    console.log(`- ID: ${docSnap.id}`, docSnap.data());
  });
  process.exit(0);
}

checkUsers().catch(console.error);
