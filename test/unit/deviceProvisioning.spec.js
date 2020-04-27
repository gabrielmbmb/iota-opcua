const request = require('request');
const async = require('async');
const { should, expect } = require('chai');
const iotAgentOPCUA = require('../../src/opcua.iotagent');
const config = require('../test-config');

// Test payloads
const noInternalAttributes = require('../json/no_internal_attributes_device.json');
const noOpcuaConnectionParameters = require('../json/no_opcua_connection_parameters.json');
const noOpcuaEndpointParameter = require('../json/no_opcua_endpoint_parameter.json');
const noOpcuaSecurityPolicyParameter = require('../json/no_opcua_security_policy_parameter.json');
const noOpcuaSecurityModeParameter = require('../json/no_opcua_security_mode_parameter.json');
const noOpcuaCredentialsParameter = require('../json/no_opcua_credentials_parameter.json');
const noOpcuaCredentialsUsernameParameter = require('../json/no_opcua_credentials_username_parameter.json');
const noOpcuaCredentialsPasswordParameter = require('../json/no_opcua_credentials_password_parameter.json');
const opcuaValidPayload = require('../json/opcua_valid_payload.json');

const host = 'localhost';
const { port } = config.iota.server;
const service = 'test';
const servicePath = '/';

const options = {
  url: `http://${host}:${port}/iot/devices`,
  method: 'POST',
  headers: {
    'fiware-service': service,
    'fiware-servicepath': servicePath,
  },
};

const optionsGetDevice = {
  url: `http://${host}:${port}/iot/devices`,
  method: 'GET',
  json: true,
  headers: {
    'fiware-service': service,
    'fiware-servicepath': servicePath,
  },
};

const optionsOCB = {
  url: `http://${config.iota.contextBroker.host}:${config.iota.contextBroker.port}/v2/entities`,
  method: 'GET',
  json: true,
  headers: {
    'fiware-service': service,
    'fiware-servicepath': servicePath,
  },
};

describe('Device provisioning API', function() {
  before(function(done) {
    async.series([async.apply(iotAgentOPCUA.start, config)], done);
  });

  after(function(done) {
    async.series([iotAgentOPCUA.stop], done);
  });

  describe('When a device provisioning does not have internalAttributes', function() {
    it('should return a message with an error', function(done) {
      request(
        { ...options, ...{ json: noInternalAttributes } },
        (err, res, body) => {
          expect(body).have.property('message');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });
  });

  describe('When a device provisioning does not have OPC UA connection parameters', function() {
    it('should return a message indicating what are the missing parameters', function(done) {
      request(
        { ...options, ...{ json: noOpcuaConnectionParameters } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include("internalAttributes can't be empty");
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });
  });

  describe('When a device provisioning is missing some OPC UA connection parameter', function() {
    it('should return a message if OPC UA endpoint is missing', function(done) {
      request(
        { ...options, ...{ json: noOpcuaEndpointParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('opcuaEndpoint was expected');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });

    it('should return a message if OPC UA security policy is missing', function(done) {
      request(
        { ...options, ...{ json: noOpcuaSecurityPolicyParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('opcuaSecurityPolicy was expected');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });

    it('should return a message if OPC UA security mode is missing', function(done) {
      request(
        { ...options, ...{ json: noOpcuaSecurityModeParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('opcuaSecurityMode was expected');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });

    it('should return a message if OPC UA credentials are missing and security mode is Sign or SignAndEncrypt', function(done) {
      request(
        { ...options, ...{ json: noOpcuaCredentialsParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('credentials were not provided');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });

    it('should return a message if OPC UA username is missing', function(done) {
      request(
        { ...options, ...{ json: noOpcuaCredentialsUsernameParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('credentials object has not key "userName"');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });

    it('should return a message if OPC UA password', function(done) {
      request(
        { ...options, ...{ json: noOpcuaCredentialsPasswordParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('credentials object has not key "password"');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });
  });

  describe('When a device provisioning request with all the required data arrives to the IoT Agent', function() {
    it('should add the device to the devices list', function(done) {
      request({ ...options, ...{ json: opcuaValidPayload } }, (err, res) => {
        should().not.exist(err);
        expect(res.statusCode).to.equal(201);
        setTimeout(function() {
          request(optionsGetDevice, (errD, resD, bodyD) => {
            should().not.exist(errD);
            expect(resD.statusCode).to.equal(200);
            bodyD.should.have.property('count', 1);
            bodyD.should.have.property('devices');
            bodyD.devices[0].should.have.property('device_id', 'TestDevice');
            done();
          });
        }, 500);
      });
    });

    it('should register the entity in OCB', function(done) {
      request(optionsOCB, (err, res, body) => {
        should().not.exist(err);
        expect(res.statusCode).to.equal(200);
        body[0].should.have.property(
          'id',
          opcuaValidPayload.devices[0].entity_name
        );
        done();
      });
    });
  });
});
