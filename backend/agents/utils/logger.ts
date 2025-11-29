/**
 * Logging utility for the AI matching agent
 * Provides structured logging with levels and context
 */

import type { AgentLog } from '../types/agent.types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  component: string;
}

class Logger {
  private config: LoggerConfig;
  private logs: AgentLog[] = [];
  private levelOrder: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level || 'info',
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile || false,
      component: config.component || 'Agent',
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.config.level];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ): string {
    const timestamp = this.formatTimestamp();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.config.component}] ${message}${dataStr}`;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, data);
    const logEntry: AgentLog = {
      timestamp: new Date(),
      level,
      component: this.config.component,
      message,
      data,
    };

    this.logs.push(logEntry);

    if (this.config.enableConsole) {
      const consoleMethod = level === 'error' ? 'error' : 'log';
      console[consoleMethod as keyof typeof console](formattedMessage);
    }
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, any>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, any>, error?: Error): void {
    this.log('error', message, {
      ...data,
      error: error?.message,
      stack: error?.stack,
    });
  }

  getLogs(): AgentLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setComponent(component: string): void {
    this.config.component = component;
  }

  summary(): { debug: number; info: number; warn: number; error: number } {
    return {
      debug: this.logs.filter((l) => l.level === 'debug').length,
      info: this.logs.filter((l) => l.level === 'info').length,
      warn: this.logs.filter((l) => l.level === 'warn').length,
      error: this.logs.filter((l) => l.level === 'error').length,
    };
  }
}

export const createLogger = (config?: Partial<LoggerConfig>): Logger => {
  return new Logger(config);
};

export default Logger;
