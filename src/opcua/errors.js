class OPCUASecurityModeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OPCUASecurityModeError';
  }
}

class OPCUASecurityPolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OPCUASecurityPolicyError';
  }
}

class OPCUAConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OPCUAConnectionError';
  }
}

class OPCUASessionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OPCUASessionError';
  }
}

class OPCUASubscriptionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OPCUASubscriptionError';
  }
}

module.exports = {
  OPCUASecurityModeError,
  OPCUASecurityPolicyError,
  OPCUAConnectionError,
  OPCUASessionError,
  OPCUASubscriptionError,
};
