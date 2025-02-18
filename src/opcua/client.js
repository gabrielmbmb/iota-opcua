const {
  coerceMessageSecurityMode,
  coerceSecurityPolicy,
  MessageSecurityMode,
  SecurityPolicy,
  OPCUAClient,
  ClientSubscription,
  AttributeIds,
  TimestampsToReturn,
} = require('node-opcua');
const logger = require('winston');
const chalk = require('chalk');

const {
  OPCUASecurityModeError,
  OPCUASecurityPolicyError,
  OPCUAConnectionError,
  OPCUASessionError,
  OPCUASubscriptionError,
} = require('./errors');

class Client {
  /**
   * Create an OPC UA client to stablish a communication with the OPC UA server
   *
   * @param {String} endpoint - The OPC UA server endpoint
   * @param {String} securityMode The OPC UA server security mode
   * @param {String} securityPolicy The OPC UA server security policy
   * @param {{username: String, password: String}} credentials The credentials for the session if securityPolicy is 'Sign' or 'SignAndEncrypt'
   * @param {{initialDelay: Number, maxRetry: Number, maxDelay: Number}} connectionStrategy
   * @throws {OPCUASecurityModeError, OPCUASecurityPolicyError}
   */
  constructor(
    endpoint,
    securityMode,
    securityPolicy,
    credentials,
    connectionStrategy
  ) {
    this.endpoint = endpoint;

    this.securityMode = coerceMessageSecurityMode(securityMode);
    if (this.securityMode === MessageSecurityMode.Invalid) {
      throw new OPCUASecurityModeError(
        `Invalid OPC UA Security Mode. Possible values: ${Object.keys(
          MessageSecurityMode
        ).join(', ')}`
      );
    }

    this.securityPolicy = coerceSecurityPolicy(securityPolicy);
    if (Object.values(SecurityPolicy).indexOf(this.securityPolicy) === -1) {
      throw new OPCUASecurityPolicyError(
        `Invalid OPC UA Security Policy. Possible values: ${Object.keys(
          SecurityPolicy
        ).join(', ')}`
      );
    }

    this.credentials = credentials;
    if (
      credentials &&
      credentials.userName !== undefined &&
      credentials.password !== undefined
    ) {
      this.credentials = credentials;
    }

    this.connectionStrategy = connectionStrategy;
    if (!this.connectionStrategy) {
      this.connectionStrategy = {
        initialDelay: 1000,
        maxRetry: 5,
        maxDelay: 5 * 1000,
      };
    }

    logger.info('Creating new OPC UA client');
    logger.info(`OPC UA Server Endpoint \t=> ${chalk.cyan(this.endpoint)}`);
    logger.info(
      `OPC UA Security Mode \t\t=> ${chalk.cyan(
        this.securityMode
      )} (${securityMode})`
    );
    logger.info(
      `OPC UA Security Policy \t=> ${chalk.cyan(this.securityPolicy)}`
    );

    this.opcuaConnectionOptions = {
      applicationName: 'OPC UA IoT Agent',
      connectionStrategy: this.connectionStrategy,
      securityMode: this.securityMode,
      securityPolicy: this.securityPolicy,
      endpoint_must_exist: false,
    };

    this.client = OPCUAClient.create(this.opcuaConnectionOptions);
    this.monitoredItems = {};
  }

  /**
   * Connect to the OPC UA server
   *
   * @async
   * @throws {OPCUAConnectionError}
   */
  async connect() {
    try {
      await this.client.connect(this.endpoint);
      logger.info(`${chalk.bgWhite.bold.black(this.endpoint)} \t=> connected`);
    } catch (e) {
      throw new OPCUAConnectionError(
        `Could not connect to OPC UA server ${this.endpoint}. Error: ${e}`
      );
    }

    this.client.on('close', () => {
      logger.info(
        `${chalk.bgWhite.bold.black(this.endpoint)} \t=> disconnected`
      );
    });
  }

  /**
   * Create a session in OPC UA server
   *
   * @async
   * @throws {OPCUASessionError}
   */
  async createSession() {
    try {
      this.session = await this.client.createSession(this.credentials);
      logger.info(
        `${chalk.bgWhite.bold.black(this.endpoint)} \t=> session created`
      );
    } catch (e) {
      throw new OPCUASessionError(
        `Could not create a session in OPC UA server ${this.endpoint}. Error: ${e}`
      );
    }

    // Callbacks for session events
    this.client
      .on('connection_reestablished', () => {
        logger.info(
          chalk.bgGreen.bold.black(
            `${this.endpoint} \t=> connection reestablished`
          )
        );
      })
      .on('backoff', (retry, delay) => {
        logger.warn(
          chalk.bgWhite.bold.yellow(
            `${this.endpoint} \t=> backoff attempt #${retry}. Retrying in ${delay}.`
          )
        );
      })
      .on('start_reconnection', () => {
        logger.info(
          chalk.bgGreen.bold.black(`${this.endpont} \t=> starting reconnection`)
        );
      })
      .on('close', () => {
        logger.info(
          `${chalk.bgWhite.bold.black(this.endpoint)} \t=> session closed`
        );
      });
  }

  /**
   * Create a subscription in the OPC UA server
   *
   * @throws {OPCUASubscriptionError}
   */
  async createSubscription() {
    const subscriptionOptions = {
      maxNotificationsPerPublish: 1000,
      publishingEnabled: true,
      requestedLifetimeCount: 1000,
      requestedMaxKeepAliveCount: 12,
      requestedPublishingInterval: 1000,
    };

    try {
      this.subscription = ClientSubscription.create(
        this.session,
        subscriptionOptions
      );
      logger.info(
        `${chalk.bgWhite.bold.black(this.endpoint)} \t=> subscription created`
      );
    } catch (e) {
      throw new OPCUASubscriptionError(
        `Could not create a subscription in OPC UA server ${this.endpoint}. Error: ${e}`
      );
    }

    // Callbacks for subscription events
    this.subscription
      .on('started', id => {
        logger.info(
          `${chalk.bgWhite.bold.black(
            this.endpoint
          )} \t=> subscription with id ${chalk.cyan(id)} started`
        );
      })
      .on('keepalive', () => {
        logger.info(
          `${chalk.bgWhite.bold.black(
            this.endpoint
          )} \t=> subscription keepalive`
        );
      })
      .on('terminated', () => {
        logger.info(
          `${chalk.bgWhite.bold.black(
            this.endpoint
          )} \t=> subscription terminated`
        );
      });
  }

  /**
   * Start monitoring a variable from the OPC UA server
   *
   * @param {String} nodeId NodeId of the variable
   * @param {Function} cb New variable value callback function
   */
  startMonitoringItem(nodeId, cb) {
    const itemToMonitor = {
      nodeId,
      attributeId: AttributeIds.Value,
    };

    const parameters = {
      samplingInterval: 1000,
      discardOldest: true,
      queueSize: 100,
    };

    this.subscription.monitor(
      itemToMonitor,
      parameters,
      TimestampsToReturn.Both,
      (err, monitoredItem) => {
        if (err) {
          cb(err);
        }

        // Add to monitoredItems object, so the monitoring can be ended later
        this.monitoredItems[nodeId] = monitoredItem;

        // Callbacks for monitored items events
        monitoredItem.on('changed', dataValue => {
          cb(null, dataValue.value.value);
        });
      }
    );
  }

  /**
   * Stop monitoring a variable from the OPC UA server
   *
   * @param {String} nodeId NodeId of the variable
   */
  stopMonitoringItem(nodeId) {
    if (this.monitoredItems[nodeId]) {
      this.monitoredItems[nodeId].terminate(err => {
        if (err) {
          logger.error(
            `An error has ocurred terminating monitoring of ${nodeId}. Error: ${JSON.stringify(
              err
            )}`
          );
        }

        this.monitoredItems[nodeId] = null;
        logger.info(
          `${chalk.bgWhite.bold.black(
            this.endpoint
          )} \t=> monitoring ${nodeId} terminated`
        );
      });
    }
  }

  /**
   * Start the OPC UA client
   *
   * @returns {Promise} Resolved when the client has terminated the start process.
   */
  async startClient() {
    return new Promise(async resolve => {
      await this.connect();
      await this.createSession();
      await this.createSubscription();
      return resolve();
    });
  }

  /**
   * Close the session and disconnect from OPC UA server
   *
   * @async
   */
  stop() {
    logger.info(
      `${chalk.bgWhite.bold.black(this.endpoint)} \t=> stopping OPC UA client`
    );
    return new Promise(async resolve => {
      const promises = [];
      if (this.subscription !== undefined) {
        promises.push(this.subscription.terminate());
      }

      if (this.session !== undefined) {
        promises.push(this.session.close());
      }

      if (this.client !== undefined) {
        promises.push(this.client.disconnect());
      }
      await Promise.all(promises);
      return resolve();
    });
  }
}

module.exports = {
  Client,
};
