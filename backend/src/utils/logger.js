const winston = require('winston');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info';
};

// Define custom colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Handle errors
  winston.format.errors({ stack: true }),
  // Add colorization
  winston.format.colorize({ all: true }),
  // Define the format of the message
  winston.format.printf(info => {
    // Handle objects and errors in the log message
    let message = info.message;
    if (typeof message === 'object') {
      message = JSON.stringify(message, null, 2);
    }
    
    // Include stack trace for errors
    const stackTrace = info.stack ? `\n${info.stack}` : '';
    
    // Return the formatted log entry
    return `[${info.timestamp}] ${info.level}: ${message}${stackTrace}`;
  })
);

// Define which transports to use based on environment
const transports = [
  // Always console output
  new winston.transports.Console(),
  
  // Always log errors to a file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Log all to another file
  new winston.transports.File({
    filename: 'logs/all.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false
});

// Create a stream object for Morgan integration
logger.stream = {
  write: message => logger.http(message.trim())
};

module.exports = logger;