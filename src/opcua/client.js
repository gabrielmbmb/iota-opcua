const {
  coerceMessageSecurityMode,
  coerceSecurityPolicy,
  MessageSecurityMode,
  SecurityPolicy,
  OPCUAClient,
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
   */
  constructor(
    endpoint,
    securityMode,
    securityPolicy,
    credentials,
    connectionStrategy
  ) {
    this.endpoint = endpoint;
    console.log(this.endpoint);

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

    this.credentials = null;
    if (
      credentials.username !== undefined &&
      credentials.password !== undefined
    ) {
      this.credentials = credentials;
    }

    this.connectionStrategy = connectionStrategy;
    if (!this.connectionStrategy) {
      this.connectionStrategy = {
        initialDelay: 1000,
        maxRetry: 1,
        maxDelay: 1000,
      };
    }

    logger.info('Creating new OPC UA client');
    logger.info(`OPC UA Server Endpoint \t=> ${chalk.cyan(this.endpoint)}`);
    logger.info(`OPC UA Security Mode \t\t=> ${chalk.cyan(this.securityMode)}`);
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
  }

  /**
   * Connect to the OPC UA server
   */
  async connect() {
    try {
      await this.client.connect(this.endpoint);
      logger.info(`Connected to OPC UA Server: ${this.endpoint}`);
    } catch {
      throw new OPCUAConnectionError(
        `Could not connect to OPC UA server: ${this.endpoint}`
      );
    }
  }

  /**
   * Create a session in OPC UA server
   */
  async createSession() {
    try {
      this.session = await this.client.createSession(this.credentials);
    } catch {
      throw new OPCUASessionError(
        `Could not create a session in OPC UA server: ${this.endpoint}`
      );
    }

    // Callbacks for session events
    opcuaClient.on('connection_reestablished', () => {
      logger.info(
        chalk.bgGreen.bold.black(
          `Connection with OPC UA server ${this.endpoint} has been reestablished`
        )
      );
    });

    opcuaClient.on('backoff', (retry, delay) => {
      logger.warn(
        chalk.bgWhite.bold.yellow(
          `backoff attempt #${retry}. Retrying in ${delay}. OPC UA server: ${this.endpoint}`
        )
      );
    });

    opcuaClient.on('start_reconnection', () => {
      logger.info(
        chalk.bgGreen.bold.black(
          `Starting reconnection with OPC UA server ${this.endpoint}!`
        )
      );
    });
  }

  /**
   * Create a subscription to the OPC UA server
   */
  createSubscription() {
    const subscriptionOptions = {
      maxNotificationsPerPublish: 10,
      priority: 10,
      publishingEnabled: true,
      requestedLifetimeCount: 1000,
      requestedMaxKeepAliveCount: 12,
      requestedPublishingInterval: 1000,
    };

    try {
      this.subscription = this.session.createSubscription2(subscriptionOptions);
    } catch {
      throw new OPCUASubscriptionError(
        `Could not create a subscription in OPC UA server: ${this.endpoint}`
      );
    }

    // Callbacks for subscription events
    this.subscription.on('started', () => {
      logger.info(
        `Subscription has been started in OPC UA server ${this.endpoint}`
      );
    });

    this.subscription.on('terminated', () => {
      logger.info(
        `Subscription has been terminated in OPC UA server ${this.endpoint}`
      );
    });
  }

  /**
   * Close the session and disconnect from OPC UA server
   */
  async stop() {
    logger.info(`Stopping client connected to OPC UA server ${this.endpoint}`);

    if (this.subscription !== undefined) {
      logger.info('Terminating OPC UA subscription...');
      await this.subscription.terminate();
    }

    if (this.session !== undefined) {
      logger.info('Closing OPC UA session...');
      await this.session.close();
    }

    if (this.client !== undefined) {
      logger.info('Disconnecting from OPC UA server...');
      await this.client.disconnect();
    }
  }
}

module.exports = {
  Client,
};
