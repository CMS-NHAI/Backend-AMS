import { createLogger, format, transports } from 'winston';
// Configure Winston logger
export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/app.log' }),
    new transports.Console()
  ]
});
