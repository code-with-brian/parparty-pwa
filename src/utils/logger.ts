/**
 * Enhanced logging utility with structured logging and different log levels
 * Replaces console.log with better error tracking and production-ready logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  userId?: string;
  guestId?: string;
  gameId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.level = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isProduction) {
      // In production, you might want to send to a logging service
      // For now, we'll use console but in a structured way
      console.log(JSON.stringify(logData));
    } else {
      // Development: more readable format
      const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.formatMessage('debug', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.formatMessage('info', message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.formatMessage('warn', message, context);
      if (!this.isProduction) {
        console.warn(message, context);
      }
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      };
      
      this.formatMessage('error', message, errorContext);
      
      if (!this.isProduction) {
        console.error(message, error, context);
      }
    }
  }

  // Convenience methods for common use cases
  userAction(action: string, context?: LogContext): void {
    this.info(`User action: ${action}`, { ...context, action });
  }

  apiCall(endpoint: string, method: string, context?: LogContext): void {
    this.debug(`API call: ${method} ${endpoint}`, { ...context, endpoint, method });
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} took ${duration}ms`, { 
      ...context, 
      operation, 
      duration 
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common patterns
export const logError = (message: string, error?: Error, context?: LogContext) => 
  logger.error(message, error, context);

export const logWarning = (message: string, context?: LogContext) => 
  logger.warn(message, context);

export const logInfo = (message: string, context?: LogContext) => 
  logger.info(message, context);

export const logDebug = (message: string, context?: LogContext) => 
  logger.debug(message, context);