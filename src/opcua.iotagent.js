const iotAgentLib = require('iotagent-node-lib');
const logger = require('winston');
const async = require('async');
const { Client } = require('./opcua/client');
const { getOPCUAconnectionParameters } = require('./utils/payload');
const { replaceForbiddenCharacters } = require('./utils/characters');

let opcuaClients = {};

/**
 * Creates a new OPC UA client to connect to an OPC UA with an endpoint. If there is already
 * a OPC UA client connected to that endpoint, then a new OPC UA client won't be created.
 *
 * @param {Object} connectionParameters OPC UA server connection parameters
 * @param {Function} cb Callback function
 */
async function createOpcuaClient(connectionParameters, cb) {
  if (!(connectionParameters.endpoint in opcuaClients)) {
    const opcuaClient = new Client(
      connectionParameters.endpoint,
      connectionParameters.securityMode,
      connectionParameters.securityPolicy,
      connectionParameters.credentials
    );

    try {
      await opcuaClient.startClient();
      return cb(null, opcuaClient);
    } catch (err) {
      return cb(err);
    }
  }

  // There is already a client created for this endpoint
  return cb(null, opcuaClients[connectionParameters.endpoint]);
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
  const internalAttributes = newDevice['internalAttributes'];
  const attributes = newDevice['active'];
  const connectionParameters = getOPCUAconnectionParameters(internalAttributes);

  if (Array.isArray(connectionParameters)) {
    logger.error(connectionParameters.join('\n'));
    return cb({ message: connectionParameters.join('\n') });
  }

  logger.info(`Creating new device: ${JSON.stringify(newDevice)}`);

  createOpcuaClient(connectionParameters, function(err, opcuaClient) {
    if (err) {
      logger.error(err);
      return cb({ message: err });
    } else {
      // Monitor variables
      for (const attr of attributes) {
        const nodeID = replaceForbiddenCharacters(attr['object_id']);
        opcuaClient.startMonitoringItem(nodeID, (err, newValue) => {
          if (err) {
            logger.error(
              `Could not start monitoring variable ${nodeID}. Error: ${err}`
            );
          }

          const values = [
            {
              name: attr.name,
              type: attr.type,
              value: newValue.toString(),
            },
          ];

          // Update entity in OCB with new value
          iotAgentLib.update(
            newDevice.name,
            newDevice.type,
            '',
            values,
            newDevice,
            function(err) {
              if (err) {
                logger.error(
                  `An error has ocurred updating entity ${
                    newDevice.name
                  }. Error: ${JSON.stringify(err)}`
                );
              } else {
                logger.debug(`Entity ${newDevice.name} has been updated`);
              }
            }
          );
        });
      }
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
  const attributes = device['active'];
  const opcuaClient = opcuaClients[device.internalAttributes.opcuaEndpoint];

  logger.info(`Removing device: ${JSON.stringify(device)}`);

  for (const attr of attributes) {
    const nodeId = replaceForbiddenCharacters(attr['object_id']);
    opcuaClient.stopMonitoringItem(nodeId);
  }

  return cb(null, device);
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
      iotAgentLib.addUpdateMiddleware(
        iotAgentLib.dataPlugins.compressTimestamp.update
      );
      iotAgentLib.addUpdateMiddleware(
        iotAgentLib.dataPlugins.attributeAlias.update
      );
      iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.addEvents.update);
      iotAgentLib.addUpdateMiddleware(
        iotAgentLib.dataPlugins.timestampProcess.update
      );
      iotAgentLib.addUpdateMiddleware(
        iotAgentLib.dataPlugins.expressionTransformation.update
      );
      iotAgentLib.addUpdateMiddleware(
        iotAgentLib.dataPlugins.multiEntity.update
      );

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
