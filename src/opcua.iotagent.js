const iotAgentLib = require('iotagent-node-lib');
const logger = require('winston');
const async = require('async');

/**
 * Start the OPCUA IoTA with the given configuration.
 *
 * @param {Object} newConfig IoTA configuration
 * @param {Function} cb Callback function
 */
function start(newConfig, cb) {
  iotAgentLib.activate(newConfig, error => {
    if (error) {
      cb(error);
    } else {
      logger.info('IoT Agent lib has been activated!');

      // Set handlers

      // Load types, services and devices
      cb();
    }
  });
}

/**
 * Stop the OPCUA IoTA
 *
 * @param {Function} cb Callback function
 */
function stop(cb) {
  logger.info('Stopping the OPC UA IoT Agent');
  async.series([iotAgentLib.resetMiddlewares, iotAgentLib.deactivate], () => {
    logger.info('OPC UA IoT Agent has been stopped!');
    return cb();
  });
}

module.exports = {
  start,
  stop,
};
