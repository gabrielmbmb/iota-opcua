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
  }

  /**
   * Connect to the OPC UA server
   */
  async connect() {
    try {
      await this.client.connect(this.endpoint);
      logger.info(`${chalk.bgWhite.bold.black(this.endpoint)} \t=> connected`);
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
      logger.info(
        `${chalk.bgWhite.bold.black(this.endpoint)} \t=> session created`
      );
    } catch {
      throw new OPCUASessionError(
        `Could not create a session in OPC UA server: ${this.endpoint}`
      );
    }

    // Callbacks for session events
    this.client.on('connection_reestablished', () => {
      logger.info(
        chalk.bgGreen.bold.black(
          `${this.endpoint} \t=> connection reestablished`
        )
      );
    });

    this.client.on('backoff', (retry, delay) => {
      logger.warn(
        chalk.bgWhite.bold.yellow(
          `${this.endpoint} \t=> backoff attempt #${retry}. Retrying in ${delay}.`
        )
      );
    });

    this.client.on('start_reconnection', () => {
      logger.info(
        chalk.bgGreen.bold.black(`${this.endpont} \t=> starting reconnection`)
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
      logger.info(
        `${chalk.bgWhite.bold.black(this.endpoint)} \t=> subscription created`
      );
    } catch {
      throw new OPCUASubscriptionError(
        `Could not create a subscription in OPC UA server: ${this.endpoint}`
      );
    }

    // Callbacks for subscription events
    // this.subscription.on('started', () => {
    //   logger.info(
    //     `Subscription has been started in OPC UA server ${this.endpoint}`
    //   );
    // });

    // this.subscription.on('terminated', () => {
    //   logger.info(
    //     `Subscription has been terminated in OPC UA server ${this.endpoint}`
    //   );
    // });
  }

  async startClient() {
    await this.connect();
    await this.createSession();
    await this.createSubscription();
  }

  /**
   * Close the session and disconnect from OPC UA server
   */
  async stop() {
    logger.info(
      `${chalk.bgWhite.bold.black(this.endpoint)} \t=> stopping OPC UA client`
    );

    if (this.session !== undefined) {
      await this.session.close();
      logger.info(
        `${chalk.bgWhite.bold.black(this.endpoint)} \t=> session closed`
      );
    }

    if (this.client !== undefined) {
      await this.client.disconnect();
      logger.info(
        `${chalk.bgWhite.bold.black(this.endpoint)} \t=> disconnected`
      );
    }
  }
}

module.exports = {
  Client,
};
