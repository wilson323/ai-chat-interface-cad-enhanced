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

export interface AgUIEvent {
  type: AgUIEventType;
  timestamp: number;
  [key: string]: any;
}

export class AgUIEventEmitter {
  private events$ = new Subject<AgUIEvent>();
  
  emit(event: AgUIEvent) {
    this.events$.next({
      ...event,
      timestamp: event.timestamp || Date.now()
    });
  }
  
  getEventStream(): Observable<AgUIEvent> {
    return this.events$.asObservable();
  }
} 