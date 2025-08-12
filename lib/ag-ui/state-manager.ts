/**
 * AG-UI状态管理器 - 管理AG-UI的状态
 * AG-UI State Manager - Manages the state of AG-UI
 *
 * 本文件提供了一个状态管理器，用于管理AG-UI的状态
 * 调用关系: 被lib/ag-ui/core-adapter.ts引用
 */

import { BehaviorSubject, type Observable } from "rxjs"

import type { Message } from "./types"

export interface AgUIState {
  chatId: string
  appId: string
  threadId: string
  messages: Message[]
  currentMessage: string
  suggestedQuestions: string[]
  variables: Record<string, any>
  isLoading: boolean
  error: Error | null
}

export class StateManager {
  private state: BehaviorSubject<AgUIState>

  constructor(initialState: Partial<AgUIState> = {}) {
    this.state = new BehaviorSubject<AgUIState>({
      chatId: "",
      appId: "",
      threadId: "",
      messages: [],
      currentMessage: "",
      suggestedQuestions: [],
      variables: {},
      isLoading: false,
      error: null,
      ...initialState,
    })
  }

  // 获取当前状态
  public getState(): AgUIState {
    return this.state.getValue()
  }

  // 获取状态Observable
  public getStateObservable(): Observable<AgUIState> {
    return this.state.asObservable()
  }

  // 更新状态
  public updateState(newState: Partial<AgUIState>): void {
    this.state.next({
      ...this.state.getValue(),
      ...newState,
    })
  }

  // 添加消息
  public addMessage(message: Message): void {
    const currentState = this.state.getValue()
    this.state.next({
      ...currentState,
      messages: [...currentState.messages, message],
    })
  }

  // 更新当前消息
  public updateCurrentMessage(delta: string): void {
    const currentState = this.state.getValue()
    this.state.next({
      ...currentState,
      currentMessage: currentState.currentMessage + delta,
    })
  }

  // 清除当前消息
  public clearCurrentMessage(): void {
    const currentState = this.state.getValue()
    this.state.next({
      ...currentState,
      currentMessage: "",
    })
  }

  // 设置加载状态
  public setLoading(isLoading: boolean): void {
    const currentState = this.state.getValue()
    this.state.next({
      ...currentState,
      isLoading,
    })
  }

  // 设置错误
  public setError(error: Error | null): void {
    const currentState = this.state.getValue()
    this.state.next({
      ...currentState,
      error,
    })
  }

  // 更新建议问题
  public updateSuggestedQuestions(questions: string[]): void {
    const currentState = this.state.getValue()
    this.state.next({
      ...currentState,
      suggestedQuestions: questions,
    })
  }

  // 更新变量
  public updateVariables(variables: Record<string, any>): void {
    const currentState = this.state.getValue()
    this.state.next({
      ...currentState,
      variables: {
        ...currentState.variables,
        ...variables,
      },
    })
  }

  // 重置状态
  public resetState(): void {
    this.state.next({
      chatId: "",
      appId: "",
      threadId: "",
      messages: [],
      currentMessage: "",
      suggestedQuestions: [],
      variables: {},
      isLoading: false,
      error: null,
    })
  }
}
