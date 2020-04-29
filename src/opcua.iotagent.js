const iotAgentLib = require('iotagent-node-lib');
const logger = require('winston');
const async = require('async');
const { Mutex } = require('async-mutex');
const { Client } = require('./opcua/client');
const { getOPCUAconnectionParameters } = require('./utils/payload');
const { replaceForbiddenCharacters } = require('./utils/characters');

let opcuaClients = {};

// Mutex to ensure that only one client is created at a time.
// This way we can recicle OPC UA clients, avoiding to create
// a new OPC UA client if one already exists for the same endpoint.
const createClientMutex = new Mutex();

/**
 * Creates a new OPC UA client to connect to an OPC UA with an endpoint. If there is already
 * a OPC UA client connected to that endpoint, then a new OPC UA client won't be created.
 *
 * @param {Object} connectionParameters OPC UA server connection parameters
 * @param {Function} cb Callback function
 * @async
 */
async function createOpcuaClient(connectionParameters, cb) {
  createClientMutex.acquire().then(async release => {
    if (!(connectionParameters.endpoint in opcuaClients)) {
      const opcuaClient = new Client(
        connectionParameters.endpoint,
        connectionParameters.securityMode,
        connectionParameters.securityPolicy,
        connectionParameters.credentials
      );

      try {
        await opcuaClient.startClient();
        release();
        return cb(null, opcuaClient);
      } catch (err) {
        release();
        return cb(err);
      }
    }

    // There is already a client created for this endpoint
    release();
    return cb(null, opcuaClients[connectionParameters.endpoint]);
  });
}

/**
 * Stop the OPC UA clients
 *
 * @param {Function} cb Callback function
 */
async function stopOpcuaClients(cb) {
  const promises = Object.keys(opcuaClients).map(endpoint => {
    return opcuaClients[endpoint].stop();
  });
  await Promise.all(promises);
  return cb();
}

/**
 * Registers a new IoT Agent device
 *
 * @param {Object} newDevice New device
 * @param {Function} cb Callback function
 */
function provisionHandler(newDevice, cb) {
  const { internalAttributes } = newDevice;
  const attributes = newDevice.active;
  const connectionParameters = getOPCUAconnectionParameters(internalAttributes);

  // Check if connectionParameters is an array of strings with errors
  if (Array.isArray(connectionParameters)) {
    logger.error(connectionParameters.join('\n'));
    return cb({ message: connectionParameters.join('\n') });
  }

  logger.info(`Creating new device: ${JSON.stringify(newDevice)}`);

  return createOpcuaClient(connectionParameters, (err, opcuaClient) => {
    if (err) {
      logger.error(err);
      return cb({ message: err });
    }
    // Monitor variables
    attributes.forEach(attr => {
      const nodeID = replaceForbiddenCharacters(attr.object_id);
      opcuaClient.startMonitoringItem(nodeID, (error, newValue) => {
        if (error) {
          logger.error(
            `Could not start monitoring variable ${nodeID}. Error: ${error}`
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
          updateErr => {
            if (updateErr) {
              logger.error(
                `An error has ocurred updating entity ${
                  newDevice.name
                }. Error: ${JSON.stringify(updateErr)}`
              );
            } else {
              logger.debug(`Entity ${newDevice.name} has been updated`);
            }
          }
        );
      });
    });
    opcuaClients[opcuaClient.endpoint] = opcuaClient;
    return cb(null, newDevice);
  });
}

/**
 * Unregisters a IoT Agent device
 *
 * @param {Object} device The device to remove
 * @param {Function} cb Callback function
 */
function removeDeviceHandler(device, cb) {
  const attributes = device.active;
  const opcuaClient = opcuaClients[device.internalAttributes.opcuaEndpoint];

  logger.info(`Removing device: ${JSON.stringify(device)}`);

  attributes.forEach(attr => {
    const nodeId = replaceForbiddenCharacters(attr.object_id);
    opcuaClient.stopMonitoringItem(nodeId);
  });

  return cb(null, device);
}

/**
 * Load devices previously created from registry.
 *
 * @param {Function} cb Callback function
 */
function loadDevices(cb) {
  logger.info('Loading devices from registry');
  iotAgentLib.listDevices((err, devices) => {
    if (err) {
      return cb(err);
    }
    return async.eachSeries(devices.devices, provisionHandler, error => {
      if (error) {
        return cb(error);
      }

      return cb();
    });
  });
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
      cb(JSON.stringify(error));
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
      async.waterfall([loadDevices], err => {
        if (err) {
          return cb(err);
        }
        return cb();
      });
    }
  });
}

/**
 * Stop the OPC UA IoT Agent
 *
 * @param {Function} cb Callback function
 */
function stop(cb) {
  logger.info('Stopping the OPC UA IoT Agent...');
  async.series(
    [stopOpcuaClients, iotAgentLib.resetMiddlewares, iotAgentLib.deactivate],
    () => {
      opcuaClients = {};
      return cb();
    }
  );
}

module.exports = {
  start,
  stop,
};
