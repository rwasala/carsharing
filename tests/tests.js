'use strict';
require('co-mocha');
const request = require('supertest');
const should = require('should');
const guid = require('guid');
const rootUrl = 'http://localhost:3000';

describe('Carsharing', function () {
    it('API should be up and running', function* () {
        // When
        const response = yield request(rootUrl).get('/');

        // Then
        response.statusCode.should.be.equal(200);
    });

    it('User should be able see car list', function* () {
        // When
        const response = yield request(rootUrl).get('/cars');

        // Then
        response.statusCode.should.be.equal(200);
        response.body.length.should.be.above(0);
    });

    it('User should be able to register', function* () {
        // Given
        const user = {
            login: guid.raw(),
            password: 'ZAQ12wsx'
        };

        // When
        const response = yield request(rootUrl).post('/customer').send(user);

        // Then
        response.statusCode.should.be.equal(201);
    });

    it('User should not be able to register without password', function* () {
        // Given
        const user = {
            login: guid.raw(),
            password: ''
        };

        // When
        const response = yield request(rootUrl).post('/customer').send(user);

        // Then
        response.statusCode.should.be.equal(400);
    });

    it('User should be able to login', function* () {
        // Given
        const user = {
            login: guid.raw(),
            password: 'ZAQ12wsx'
        };
        yield request(rootUrl).post('/customer').send(user).expect(201);

        // When
        const response = yield request(rootUrl).post('/login').send(user);

        // Then
        response.statusCode.should.be.equal(200);
        response.body['token'].should.not.be.empty();
    });

    it('Check if user is able to add credit card', function* () {
        // Given
        const user = {
            login: guid.raw(),
            password: 'ZAQ12wsx',
            creditCardNumber: '123456789012'
        };
        yield request(rootUrl).post('/customer').send(user).expect(201);
        const authToken = (yield request(rootUrl).post('/login').send(user)).body['token'];

        // When
        const addCreditCardResponse = yield request(rootUrl)
            .post('/addCreditCard')
            .send({ creditCardNumber: user.creditCardNumber })
            .set('Authorization', `Bearer ${authToken}`);
        const getCustomerResponse = yield request(rootUrl)
            .get('/customer')
            .set('Authorization', `Bearer ${authToken}`);

        // Then
        addCreditCardResponse.statusCode.should.be.equal(204);
        getCustomerResponse.statusCode.should.be.equal(200);
        getCustomerResponse.body['creditCardNumber'].should.be.equal(user.creditCardNumber.substr(user.creditCardNumber.length - 4));
    });

    it('Not fully registered user should not be able to create reservation', function* () {
        // Given
        const user = {
            login: guid.raw(),
            password: 'ZAQ12wsx',
            creditCardNumber: '123456789012'
        };
        yield request(rootUrl).post('/customer').send(user).expect(201);
        const authToken = (yield request(rootUrl).post('/login').send(user)).body['token'];

        // When
        const response = yield request(rootUrl)
            .post('/createReservation')
            .send({ carId: 1 })
            .set('Authorization', `Bearer ${authToken}`);
        const getCustomerResponse = yield request(rootUrl)
            .get('/customer')
            .set('Authorization', `Bearer ${authToken}`);

        // Then
        response.statusCode.should.be.equal(412);
        getCustomerResponse.body['reservations'].should.be.empty();
    });

    it('Fully registered user should be able to create reservation', function* () {
        // Given
        const user = {
            login: guid.raw(),
            password: 'ZAQ12wsx',
            creditCardNumber: '123456789012'
        };
        const admin = {
            login: 'admin',
            password: 'Runforest1'
        };
        yield request(rootUrl).post('/customer').send(user).expect(201);
        const authToken = (yield request(rootUrl).post('/login').send(user)).body['token'];
        const adminToken = (yield request(rootUrl).post('/login').send(admin)).body['token'];

        // When
        yield request(rootUrl)
            .post('/addCreditCard')
            .send({ creditCardNumber: user.creditCardNumber })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(204);
        yield request(rootUrl)
            .patch(`/validate/${user.login}`)
            .send({})
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(204);
        const response = yield request(rootUrl)
            .post('/createReservation')
            .send({ carId: 1 })
            .set('Authorization', `Bearer ${authToken}`);
        const getCustomerResponse = yield request(rootUrl)
            .get('/customer')
            .set('Authorization', `Bearer ${authToken}`);

        // Then
        response.statusCode.should.be.equal(201);
        getCustomerResponse.body['reservations'].length.should.be.equal(1);
    });
})  