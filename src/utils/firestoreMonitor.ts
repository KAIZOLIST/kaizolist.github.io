/**
 * Real-time Firestore Read & Write Telemetry Monitor
 * 
 * Intercepts and logs all Firestore read and write operations (getDoc, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc)
 * tracking document operation counts by collection, path, operation type, and caller component.
 */

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: 'read' | 'write';
  operation: 'getDoc' | 'getDocs' | 'onSnapshot' | 'getDocFromServer' | 'setDoc' | 'updateDoc' | 'deleteDoc';
  path: string;
  collection: string;
  count: number;
  caller?: string;
  isInitialSnapshot?: boolean;
}

export type ReadEvent = TelemetryEvent;

export interface TelemetryStats {
  totalReads: number;
  totalWrites: number;
  readsByCollection: Record<string, number>;
  writesByCollection: Record<string, number>;
  readsByOperation: Record<string, number>;
  writesByOperation: Record<string, number>;
  events: TelemetryEvent[];
  activeListeners: Record<string, number>;
  refreshCount: number;
  sessionStartTime: string;
}

export type ReadStats = TelemetryStats;

type MonitorListener = (stats: TelemetryStats) => void;

const STORAGE_KEY = 'gdk_firestore_read_telemetry_v1';

class FirestoreMonitor {
  private events: TelemetryEvent[] = [];
  private totalReads = 0;
  private totalWrites = 0;
  private readsByCollection: Record<string, number> = {};
  private writesByCollection: Record<string, number> = {};
  private readsByOperation: Record<string, number> = {};
  private writesByOperation: Record<string, number> = {};
  private activeListeners: Record<string, number> = {};
  private listeners: Set<MonitorListener> = new Set();
  private maxEvents = 300;
  private refreshCount = 1;
  private sessionStartTime: string = new Date().toLocaleTimeString();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.totalReads === 'number') this.totalReads = parsed.totalReads;
        if (typeof parsed.totalWrites === 'number') this.totalWrites = parsed.totalWrites;
        if (parsed.readsByCollection && typeof parsed.readsByCollection === 'object') {
          this.readsByCollection = parsed.readsByCollection;
        }
        if (parsed.writesByCollection && typeof parsed.writesByCollection === 'object') {
          this.writesByCollection = parsed.writesByCollection;
        }
        if (parsed.readsByOperation && typeof parsed.readsByOperation === 'object') {
          this.readsByOperation = parsed.readsByOperation;
        }
        if (parsed.writesByOperation && typeof parsed.writesByOperation === 'object') {
          this.writesByOperation = parsed.writesByOperation;
        }
        if (Array.isArray(parsed.events)) this.events = parsed.events;
        if (typeof parsed.refreshCount === 'number') this.refreshCount = parsed.refreshCount + 1;
        if (parsed.sessionStartTime) this.sessionStartTime = parsed.sessionStartTime;
      }
      
      // Record a page refresh marker event
      const refreshEvent: TelemetryEvent = {
        id: `evt-refresh-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'read',
        operation: 'getDoc',
        path: `system/page-refresh-#${this.refreshCount}`,
        collection: 'system',
        count: 0,
        caller: `Page Reload #${this.refreshCount}`,
        isInitialSnapshot: true
      };
      this.events.unshift(refreshEvent);
      if (this.events.length > this.maxEvents) {
        this.events.pop();
      }
      this.saveToStorage();
    } catch (err) {
      console.warn('Could not load telemetry from localStorage:', err);
    }
  }

  private saveToStorage() {
    try {
      const data = {
        totalReads: this.totalReads,
        totalWrites: this.totalWrites,
        readsByCollection: this.readsByCollection,
        writesByCollection: this.writesByCollection,
        readsByOperation: this.readsByOperation,
        writesByOperation: this.writesByOperation,
        events: this.events.slice(0, this.maxEvents),
        refreshCount: this.refreshCount,
        sessionStartTime: this.sessionStartTime
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      // Ignore quota errors if storage is full
    }
  }

  public subscribe(listener: MonitorListener): () => void {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStats(): TelemetryStats {
    return {
      totalReads: this.totalReads,
      totalWrites: this.totalWrites,
      readsByCollection: { ...this.readsByCollection },
      writesByCollection: { ...this.writesByCollection },
      readsByOperation: { ...this.readsByOperation },
      writesByOperation: { ...this.writesByOperation },
      events: [...this.events],
      activeListeners: { ...this.activeListeners },
      refreshCount: this.refreshCount,
      sessionStartTime: this.sessionStartTime
    };
  }

  public logRead(
    operation: 'getDoc' | 'getDocs' | 'onSnapshot' | 'getDocFromServer',
    path: string,
    count: number,
    caller?: string,
    isInitialSnapshot?: boolean
  ) {
    if (count <= 0) return;

    const pathParts = path.split('/');
    const collection = pathParts[0] || 'unknown';

    this.totalReads += count;
    this.readsByCollection[collection] = (this.readsByCollection[collection] || 0) + count;
    this.readsByOperation[operation] = (this.readsByOperation[operation] || 0) + count;

    const event: TelemetryEvent = {
      id: `evt-r-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'read',
      operation,
      path,
      collection,
      count,
      caller,
      isInitialSnapshot
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    this.saveToStorage();
    this.notify();
  }

  public logWrite(
    operation: 'setDoc' | 'updateDoc' | 'deleteDoc',
    path: string,
    count: number,
    caller?: string
  ) {
    if (count <= 0) return;

    const pathParts = path.split('/');
    const collection = pathParts[0] || 'unknown';

    this.totalWrites += count;
    this.writesByCollection[collection] = (this.writesByCollection[collection] || 0) + count;
    this.writesByOperation[operation] = (this.writesByOperation[operation] || 0) + count;

    const event: TelemetryEvent = {
      id: `evt-w-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'write',
      operation,
      path,
      collection,
      count,
      caller
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    this.saveToStorage();
    this.notify();
  }

  public trackListenerAttach(path: string) {
    const collection = path.split('/')[0] || path;
    this.activeListeners[collection] = (this.activeListeners[collection] || 0) + 1;
    this.notify();
  }

  public trackListenerDetach(path: string) {
    const collection = path.split('/')[0] || path;
    if (this.activeListeners[collection]) {
      this.activeListeners[collection] = Math.max(0, this.activeListeners[collection] - 1);
      if (this.activeListeners[collection] === 0) {
        delete this.activeListeners[collection];
      }
    }
    this.notify();
  }

  public reset() {
    this.events = [];
    this.totalReads = 0;
    this.totalWrites = 0;
    this.readsByCollection = {};
    this.writesByCollection = {};
    this.readsByOperation = {};
    this.writesByOperation = {};
    this.refreshCount = 1;
    this.sessionStartTime = new Date().toLocaleTimeString();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {}
    this.notify();
  }

  private notify() {
    const stats = this.getStats();
    for (const listener of this.listeners) {
      try {
        listener(stats);
      } catch (err) {
        console.error('Error notifying monitor listener:', err);
      }
    }
  }
}

export const firestoreMonitor = new FirestoreMonitor();
