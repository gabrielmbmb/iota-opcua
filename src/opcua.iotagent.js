const iotAgentLib = require('iotagent-node-lib');
const logger = require('winston');
const async = require('async');
const opcua = require('node-opcua');
const chalk = require('chalk');

let opcuaClient;
let opcuaSession;
let opcuaSubscription;

/**
 * Registers a new IoT Agent device
 *
 * @param {Object} newDevice New device
 * @param {Function} cb Callback function
 */
function provisionHandler(newDevice, cb) {
  logger.info(`Creating new device: ${JSON.stringify(newDevice)}`);
  return cb(null, device);
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
 * Close the session and disconnect from OPC UA server
 *
 * @async
 */
async function closeOPCUAconnection() {
  if (opcuaSession !== undefined) {
    logger.info('Closing OPC UA session...');
    await opcuaSession.close();
  }

  if (opcuaClient !== undefined) {
    logger.info('Disconnecting from OPC UA server...');
    await opcuaClient.disconnect();
  }
}

/**
 * Start the OPC UA IoT Agent with the given configuration.
 *
 * @async
 * @param {Object} newConfig IoTA configuration
 * @param {Function} cb Callback function
 */
async function start(newConfig, cb) {
  // Check if OPC UA server endpoint is defined
  if (!newConfig.opcua.endpoint) {
    const error =
      'OPC UA server endpoint is not defined in config.js!. Aborting...';
    return cb(error);
  }

  // OPC UA server connection settings
  const securityMode = opcua.coerceMessageSecurityMode(
    newConfig.opcua.securityMode
  );

  if (securityMode === opcua.MessageSecurityMode.Invalid) {
    const error = `Invalid OPC UA Security Mode in config.js!. Possible values: ${Object.keys(
      opcua.MessageSecurityMode
    ).join(', ')}`;
    return cb(error);
  }

  const securityPolicy = opcua.coerceSecurityPolicy(
    newConfig.opcua.securityPolicy
  );

  if (Object.values(opcua.SecurityPolicy).indexOf(securityPolicy) === -1) {
    const error = `Invalid OPC UA Security Policy in config.js!. Possible values: ${Object.keys(
      opcua.SecurityPolicy
    ).join(', ')}`;
    return cb(error);
  }

  let credentials = null;

  if (
    newConfig.opcua.credentials.userName &&
    newConfig.opcua.credentials.password
  ) {
    credentials = {
      userName: newConfig.opcua.credentials.userName,
      password: newConfig.opcua.credentials.password,
    };
    logger.info('Using OPC UA credentials from config.js');
  }

  var connectionStrategy = newConfig.opcua.connectionStrategy;

  if (!newConfig.opcua.connectionStrategy) {
    connectionStrategy = {
      initialDelay: 1000,
      maxRetry: 1,
      maxDelay: 1000,
    };
  }

  const opcuaOptions = {
    applicationName: 'OPC UA IoT Agent',
    connectionStrategy: connectionStrategy,
    securityMode,
    securityPolicy,
    endpoint_must_exist: false,
  };

  logger.info(
    `OPC UA Server Endpoint \t=> ${chalk.cyan(newConfig.opcua.endpoint)}`
  );
  logger.info(
    `OPC UA Security Mode \t\t=> ${chalk.cyan(newConfig.opcua.securityMode)}`
  );
  logger.info(
    `OPC UA Security Policy \t=> ${chalk.cyan(newConfig.opcua.securityPolicy)}`
  );

  // Create OPC UA client
  opcuaClient = opcua.OPCUAClient.create(opcuaOptions);

  try {
    // Connect to OPC UA server
    await opcuaClient.connect(newConfig.opcua.endpoint);
    logger.info(
      `Connection stablished \t=> ${chalk.bgGreen.bold.black(
        newConfig.opcua.endpoint
      )}`
    );

    // Create a session
    opcuaSession = await opcuaClient.createSession(credentials);
    logger.info(`Session created in OPC UA server`);

    // Callbacks for sessions events
    opcuaClient.on('connection_reestablished', () => {
      logger.info(
        chalk.bgGreen.bold.black(
          'Connection with OPC UA server has been reestablished'
        )
      );
    });

    opcuaClient.on('backoff', (retry, delay) => {
      logger.warn(
        chalk.bgWhite.yellow(`backoff attemp #${retry}. Retrying in ${delay}`)
      );
    });

    opcuaClient.on('start_reconnection', () => {
      logger.info(
        chalk.bgGreen.bold.black('Staring reconnection with OPC UA server!')
      );
    });

    // Create subscription in OPC UA server
    const subscriptionOptions = {
      maxNotificationsPerPublish: 10,
      priority: 10,
      publishingEnabled: true,
      requestedLifetimeCount: 1000,
      requestedMaxKeepAliveCount: 12,
      requestedPublishingInterval: 1000,
    };

    opcuaSubscription = opcuaSession.createSubscription2(subscriptionOptions);
    logger.info(
      `Subscription created in OPC UA server: ${JSON.stringify(
        subscriptionOptions
      )}`
    );
  } catch (err) {
    const error = `OPC UA server connection error => ${err}`;
    return cb(error);
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
  async.series(
    [
      iotAgentLib.resetMiddlewares,
      iotAgentLib.deactivate,
      closeOPCUAconnection,
    ],
    () => {
      logger.info('OPC UA IoT Agent has been stopped!');
    }
  );
}

module.exports = {
  start,
  stop,
};
