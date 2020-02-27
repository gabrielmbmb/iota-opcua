const iotAgentLib = require('iotagent-node-lib');
const logger = require('winston');
const async = require('async');
const { Client } = require('./opcua/client');
const { getOPCUAconnectionParameters } = require('./utils/payload');
const { config } = require('./services/config.service');

let opcuaClients = {};

/**
 * Creates a new OPC UA client to connect to an OPC UA with an endpoint. If there is already
 * a OPC UA client connected to that endpoint, then a new OPC UA client won't be created.
 *
 * @param {Object} connectionParameters OPC UA server connection parameters
 * @param {Function} cb Callback function
 */
function createOpcuaClient(connectionParameters, cb) {
  if (!(connectionParameters.endpoint in opcuaClients)) {
    const opcuaClient = new Client(
      connectionParameters.endpoint,
      connectionParameters.securityMode,
      connectionParameters.securityPolicy,
      connectionParameters.credentials
    );

    try {
      opcuaClient.startClient();
      return cb(null, opcuaClient);
    } catch (err) {
      return cb(err);
    }
  }
}

/**
 * Stop the OPC UA clients
 *
 * @async
 */
async function stopOpcuaClients() {
  for (endpoint in opcuaClients) {
    await opcuaClients[endpoint].stop();
  }
}

/**
 * Registers a new IoT Agent device
 *
 * @param {Object} newDevice New device
 * @param {Function} cb Callback function
 */
function provisionHandler(newDevice, cb) {
  logger.info(`Creating new device: ${JSON.stringify(newDevice)}`);

  const internalAttributes = newDevice['internalAttributes'];
  const connectionParameters = getOPCUAconnectionParameters(internalAttributes);

  if (Array.isArray(connectionParameters)) {
    logger.error(connectionParameters.join('\n'));
    return cb({ message: connectionParameters.join('\n') });
  }

  createOpcuaClient(connectionParameters, function(err, opcuaClient) {
    if (err) {
      logger.error(err);
      return cb({ message: err });
    } else {
      opcuaClients[opcuaClient.endpoint] = opcuaClient;
      return cb(null, newDevice);
    }
  });
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
 * @param {Function} callback Callback function
 */
function start(newConfig, cb) {
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
  async.series(
    [stopOpcuaClients, iotAgentLib.resetMiddlewares, iotAgentLib.deactivate],
    () => {
      logger.info('OPC UA IoT Agent has been stopped!');
    }
  );
}

module.exports = {
  start,
  stop,
};
