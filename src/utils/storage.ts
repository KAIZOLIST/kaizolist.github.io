import { ProofSubmission } from '../types/kaizo';

const STORAGE_KEY_SUBMISSIONS = 'goober_kaizo_submissions_v1';

export function getSubmissions(): ProofSubmission[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading submissions:', err);
  }
  return [
    {
      id: 'sub-sample-1',
      levelId: 'level-1',
      levelName: 'Inferno Core',
      player: 'BlazeBean',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      status: 'pending',
      submittedAt: '2026-04-12T14:22:00Z'
    }
  ];
}

export function saveSubmissions(submissions: ProofSubmission[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
  } catch (err) {
    console.error('Error saving submissions:', err);
  }
}
