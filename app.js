const express = require('express');
const app = express();
const bodyParser = require('body-parser');
let customerList = [];
let carList = [];

app.use(bodyParser.json());
app.listen(3000, function () {
    initialize();
    console.log('App is running...');
});

app.get('/', function (req, res) {
    res.sendStatus(200);
});

app.post('/customer', function (req, res) {
    let statusCode = 201;
    const user = req.body;
    user.reservations = [];
    user.validated = false;
    if (!user.login || !user.password) {
        statusCode = 400;
    } else {
        if (customerList.filter(customer => customer.login === user.login).length !== 0) {
            statusCode = 409;
        }
        else {
            customerList.push(user);
        }
    }
    res.sendStatus(statusCode);
});

app.post('/login', function (req, res) {
    let statusCode = 200;
    let token = "";
    const credentials = req.body;
    if (!credentials.login || !credentials.password) {
        statusCode = 400;
    } else {
        const customer = customerList.filter(customer => customer.login === credentials.login && customer.password === credentials.password)[0];
        if (!customer) {
            statusCode = 400;
        } else {
            token = generateRandomString();
            customer.token = token;
        }
    }
    res.status(statusCode).send({ token });
});

app.post('/addCreditCard', function (req, res) {
    let statusCode = 204;
    let customer = {};
    const creditCard = req.body.creditCardNumber;
    if (!req.headers.authorization|| !creditCard || creditCard.length != 12) {
        statusCode = 400;
    } else {
        const token = req.headers.authorization.replace("Bearer ", "");
        customer = customerList.filter(customer => customer.token === token)[0];
        if (!customer) {
            statusCode = 403;
        } else {
            customer.creditCardNumber = creditCard;
        }
    }
    res.sendStatus(statusCode);
});

app.get('/customer', function (req, res) {
    let statusCode = 200;
    let customer = {};
    const response = {};
    if (!req.headers.authorization) {
        statusCode = 400;
    } else {
        const token = req.headers.authorization.replace("Bearer ", "");
        customer = customerList.filter(customer => customer.token === token)[0];
        if (!customer) {
            statusCode = 403;
        } else {
            response.login = customer.login;
            response.creditCardNumber = customer.creditCardNumber !== undefined ? customer.creditCardNumber.substr(customer.creditCardNumber.length - 4) : "";
            response.validated = customer.validated;
            response.reservations = customer.reservations;
        }
    }
    res.status(statusCode).send(response);
});

app.patch('/changePassword', function (req, res) {
    let statusCode = 204;
    let customer = {};
    const newPassword = req.body.password;
    if (!req.headers.authorization || !newPassword) {
        statusCode = 400;
    } else {
        const token = req.headers.authorization.replace("Bearer ", "");
        customer = customerList.filter(customer => customer.token === token)[0];
        if (customer === undefined) {
            statusCode = 403;
        } else {
            customer.password = newPassword;
        }
    }
    res.sendStatus(statusCode);
});

app.patch('/validate/:login', function (req, res) {
    let statusCode = 204;
    const login = req.params.login;
    if (!req.headers.authorization) {
        statusCode = 400;
    } else {
        const token = req.headers.authorization.replace("Bearer ", "");
        customer = customerList.filter(customer => customer.token === token && customer.login === "admin")[0];
        if (!customer) {
            statusCode = 403;
        } else {
            customerIndex = customerList.findIndex((customer => customer.login === login));
            if (customerIndex === -1) {
                statusCode = 404;
            } else {
                customerList[customerIndex].validated = true;
            }
        }
    }
    res.sendStatus(statusCode);
});

app.get('/cars', function (req, res) {
    res.status(200).send(carList);
});

app.post('/createReservation', function (req, res) {
    let statusCode = 201;
    const carId = req.body.carId;
    if (!req.headers.authorization || !carId || carId < 1) {
        statusCode = 400;
    } else {
        const token = req.headers.authorization.replace("Bearer ", "");
        const customer = customerList.filter(customer => customer.token === token)[0];
        if (!customer) {
            statusCode = 403;
        } else {
            if (!customer.creditCardNumber || customer.validated === false) {
                statusCode = 405;
            } else {
                const car = carList[carId - 1];
                if (!car) {
                    statusCode = 404;
                } else {
                    if (car.available === false) {
                        statusCode = 409;
                    } else {
                        car.available = false;
                        customer.reservations.push({
                            carId,
                            when: Date.now()
                        });
                    }
                }
            }
        }
    }
    res.sendStatus(statusCode);
});

app.get('/reset', function (req, res) {
    initialize();
    res.sendStatus(200);
});

const initialize = function () {
    customerList = [];
    carList = [];
    customerList.push({
        login: "admin",
        password: "Runforest1"
    });
    for (let i = 1; i <= 30; ++i) {
        carList.push({
            id: i,
            carName: "Car " + i,
            available: true
        });
    }
}

const generateRandomString = function () {
    let text = '';
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 30; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
