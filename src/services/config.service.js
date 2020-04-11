/* eslint no-param-reassign: 0 */
const logger = require('winston');

/**
 *  Sets the configuration of the logger
 *
 * @param {Object} config
 */
function configureLogger(config) {
  // Custom JSON formatter
  const jsonFormatter = logger.format.combine(
    logger.format(info => {
      info.level = info.level.toUpperCase();
      return info;
    })(),
    logger.format.timestamp(),
    logger.format.splat(),
    logger.format.printf(info =>
      JSON.stringify({
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
      })
    )
  );

  const transports = [
    new logger.transports.Console({
      format: logger.format.combine(
        logger.format(info => {
          info.level = info.level.toUpperCase();
          return info;
        })(),
        logger.format.colorize(),
        logger.format.timestamp(),
        logger.format.splat(),
        logger.format.printf(
          info => `[${info.timestamp}][${info.level}]: ${info.message}`
        )
      ),
    }),
  ];

  // If true, save log messages to error.json and log.json
  if (config.iota.logFile) {
    transports.push(
      new logger.transports.File({
        filename: './logs/error.json',
        level: 'error',
        format: jsonFormatter,
      })
    );
    transports.push(
      new logger.transports.File({
        filename: './logs/log.json',
        format: jsonFormatter,
      })
    );
  }

  // Configure logger
  logger.configure({
    level: config.iota.logLevel.toLowerCase(),
    transports,
  });
}

class Config {
  setConfig(config) {
    this.iota = config.iota;
    this.opcua = config.opcua;
  }
}

const config = new Config();

/**
 * Sets the IoT Agent global config
 *
 * @param {Object} newConfig The new IoT Agent config
 */
function setConfig(newConfig) {
  config.setConfig(newConfig);
  configureLogger(newConfig);
}

module.exports = {
  setConfig,
  config,
};
