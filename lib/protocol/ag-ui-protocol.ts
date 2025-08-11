import { Observable, Subject } from 'rxjs';

export type AgUIEventType = 
  | 'TEXT_MESSAGE_START' 
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_ARGS'
  | 'TOOL_CALL_END'
  | 'STATE_SNAPSHOT'
  | 'STATE_DELTA'
  | 'RUN_STARTED'
  | 'RUN_FINISHED'
  | 'RUN_ERROR';

export interface AgUIEventBase {
  type: AgUIEventType;
  timestamp: number;
}

export type AgUIEvent = AgUIEventBase & Partial<Record<string, unknown>>;

export class AgUIEventEmitter {
  private events$ = new Subject<AgUIEvent>();
  
  emit(event: { type: AgUIEventType } & Partial<Record<string, unknown>> & { timestamp?: number }) {
    const ts = typeof event.timestamp === 'number' ? event.timestamp : Date.now();
    this.events$.next({
      ...(event as Record<string, unknown>),
      type: event.type,
      timestamp: ts
    } as AgUIEvent);
  }
  
  getEventStream(): Observable<AgUIEvent> {
    return this.events$.asObservable();
  }
} 