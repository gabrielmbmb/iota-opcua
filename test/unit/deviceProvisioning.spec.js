/* eslint-disable no-underscore-dangle  */
const request = require('request');
const async = require('async');
const { should, expect } = require('chai');
const rewire = require('rewire');
const config = require('../test-config');
const configService = require('../../src/services/config.service');
const util = require('../util');

// Use rewire, so we can inspect not exported variables
const iotAgentOPCUA = rewire('../../src/opcua.iotagent');

// Test payloads
const noInternalAttributes = require('../json/deviceProvisioning/no_internal_attributes_device.json');
const noOpcuaConnectionParameters = require('../json/deviceProvisioning/no_opcua_connection_parameters.json');
const noOpcuaEndpointParameter = require('../json/deviceProvisioning/no_opcua_endpoint_parameter.json');
const noOpcuaSecurityPolicyParameter = require('../json/deviceProvisioning/no_opcua_security_policy_parameter.json');
const noOpcuaSecurityModeParameter = require('../json/deviceProvisioning/no_opcua_security_mode_parameter.json');
const noOpcuaCredentialsParameter = require('../json/deviceProvisioning/no_opcua_credentials_parameter.json');
const noOpcuaCredentialsUsernameParameter = require('../json/deviceProvisioning/no_opcua_credentials_username_parameter.json');
const noOpcuaCredentialsPasswordParameter = require('../json/deviceProvisioning/no_opcua_credentials_password_parameter.json');
const opcuaValidPayload = require('../json/deviceProvisioning/opcua_valid_payload.json');
const opcuaTwoDevicesValidPayload = require('../json/deviceProvisioning/opcua_two_devices_valid_payload.json');

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

const hostOCB = config.iota.contextBroker.host;
const portOCB = config.iota.contextBroker.port;

const optionsOCB = {
  url: `http://${hostOCB}:${portOCB}/v2/entities`,
  method: 'GET',
  json: true,
  headers: {
    'fiware-service': service,
    'fiware-servicepath': servicePath,
  },
};

configService.setConfig(config);

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
    after(function(done) {
      async.series(
        [
          async.apply(
            util.removeDevice,
            `http://${host}:${port}`,
            opcuaValidPayload.devices[0].device_id,
            service,
            servicePath
          ),
          async.apply(
            util.removeEntity,
            `http://${hostOCB}:${portOCB}`,
            opcuaValidPayload.devices[0].entity_name,
            service,
            servicePath
          ),
        ],
        done
      );
    });

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

  describe('When a multiple device provisioning request with all the required data arrive to the IoT Agent', function() {
    after(function(done) {
      async.series(
        [
          async.apply(
            util.removeDevice,
            `http://${host}:${port}`,
            opcuaTwoDevicesValidPayload.devices[0].device_id,
            service,
            servicePath
          ),
          async.apply(
            util.removeDevice,
            `http://${host}:${port}`,
            opcuaTwoDevicesValidPayload.devices[1].device_id,
            service,
            servicePath
          ),
          async.apply(
            util.removeEntity,
            `http://${hostOCB}:${portOCB}`,
            opcuaTwoDevicesValidPayload.devices[0].entity_name,
            service,
            servicePath
          ),
          async.apply(
            util.removeEntity,
            `http://${hostOCB}:${portOCB}`,
            opcuaTwoDevicesValidPayload.devices[1].entity_name,
            service,
            servicePath
          ),
        ],
        done
      );
    });

    it('should create just one OPC UA client if the endpoint for both devices is the same', function(done) {
      request(
        { ...options, ...{ json: opcuaTwoDevicesValidPayload } },
        (err, res) => {
          should().not.exist(err);
          expect(res.statusCode).to.equal(201);
          expect(
            Object.keys(iotAgentOPCUA.__get__('opcuaClients')).length
          ).to.equal(1);
          done();
        }
      );
    });

    it('should add the devices to the devices list', function(done) {
      request(optionsGetDevice, (err, res, body) => {
        should().not.exist(err);
        expect(res.statusCode).to.equal(200);
        body.should.have.property('count', 2);
        body.should.have.property('devices');
        body.devices[0].should.have.property(
          'device_id',
          opcuaTwoDevicesValidPayload.devices[0].device_id
        );
        body.devices[1].should.have.property(
          'device_id',
          opcuaTwoDevicesValidPayload.devices[1].device_id
        );
        done();
      });
    });
  });
});
