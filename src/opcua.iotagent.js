const iotAgentLib = require('iotagent-node-lib');
const logger = require('winston');
const async = require('async');
const chalk = require('chalk');
const { Client } = require('./opcua/client');

let opcuaClient;
let opcuaSession;
let opcuaSubscription;

let opcuaClients = {};

/**
 * Registers a new IoT Agent device
 *
 * @param {Object} newDevice New device
 * @param {Function} cb Callback function
 */
function provisionHandler(newDevice, cb) {
  logger.info(`Creating new device: ${JSON.stringify(newDevice)}`);

  const staticAttributes = newDevice['staticAttributes'];
  let opcuaEndpoint;

  if (staticAttributes) {
    logger.debug(JSON.stringify(staticAttributes));
    // Check if the device has an OPCUA server specified
    const opcuaAttr = staticAttributes.find(
      attr => attr['name'] === 'opcuaEndpoint'
    );
    if (opcuaAttr) {
      opcuaEndpoint = opcuaAttr['value'];
    }
  }

  logger.debug(chalk.red.bold(`OPCUA ENDPOINT: ${opcuaEndpoint}`));

  // Check internal attributes

  return cb(null, newDevice);
}

/**
 * Unregisters a IoT Agent device
 *
 * @param {Object} device The device to remove
 * @param {Function} cb Callback function
 */
function removeDeviceHandler(device, cb) {
  logger.info(`Removing device: ${JSON.stringify(device)}`);
}

/**
 * Start the OPC UA IoT Agent with the given configuration.
 *
 * @async
 * @param {Object} newConfig IoTA configuration
 * @param {Function} cb Callback function
 */
async function start(newConfig, cb) {
  try {
    const opcuaClient = new Client(
      newConfig.opcua.endpoint,
      newConfig.opcua.securityMode,
      newConfig.opcua.securityPolicy,
      newConfig.opcua.credentials,
      newConfig.opcua.connectionStrategy
    );

    // async.series(
    //   [
    //     opcuaClient.connect(),
    //     opcuaClient.createSession,
    //     opcuaClient.createSubscription,
    //     opcuaClient.stop,
    //   ],
    //   function(err, res) {
    //     console.log(err, res);
    //   }
    // );
  } catch (err) {
    console.log(err);
  }

  iotAgentLib.activate(newConfig.iota, error => {
    if (error) {
      cb(error);
    } else {
      logger.info('IoT Agent lib has been activated!');

      // Set handlers
      iotAgentLib.setProvisioningHandler(provisionHandler);
      iotAgentLib.setRemoveDeviceHandler(removeDeviceHandler);

      // Set update middlewares
      iotAgentLib.addUpdateMiddleware();

      // Load types, services and devices
      async.waterfall([], () => {});
      cb();
    }
  });
}

/**
 * Stop the OPC UA IoT Agent
 */
function stop() {
  logger.info('Stopping the OPC UA IoT Agent...');
  async.series([iotAgentLib.resetMiddlewares, iotAgentLib.deactivate], () => {
    logger.info('OPC UA IoT Agent has been stopped!');
  });
}

module.exports = {
  start,
  stop,
};
