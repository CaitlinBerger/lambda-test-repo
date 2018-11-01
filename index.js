var express = require('express')
var bodyParser = require('body-parser')
var AWS = require('aws-sdk')
var uuid = require('node-uuid')

// the init file is only used to populate the database the first time
var init = require('./init.js')

// declare a new express app
var app = express()
app.use(bodyParser.json())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
});


const MENU_TABLE_NAME = process.env.MENU_TABLE_NAME;
const ORDERS_TABLE_NAME = process.env.ORDERS_TABLE_NAME;
const RESTAURANTS_TABLE_NAME = process.env.RESTAURANTS_TABLE_NAME;

AWS.config.update({ region: process.env.REGION })

// The DocumentClient class allows us to interact with DynamoDB using normal objects.
// Documentation for the class is available here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html
var dynamoDb = new AWS.DynamoDB.DocumentClient()

/**********************
 * Restaurant methods *
 **********************/

app.get('/items/restaurants', function(req, res) {
    // performs a DynamoDB Scan operation to extract all of the records in the table
    dynamoDb.scan({ TableName: RESTAURANTS_TABLE_NAME }, function(err, data) {
        if (err) {
            console.log(err)
            res.status(500).json({
                message: "Could not load restaurants"
            }).end()
        } else {
            res.json(data['Items'])
        }
    })
})

app.get('/items/restaurants/:restaurantId', function(req, res) {
    // Extracts a specific restaurant from the databsae. If an invalid restaurantId is sent
    // we will returna 400 status code. If the parameter value is valid but we cannot find
    // that restaurant in our database we return a 404
    if (!req.params.restaurantId) {
        res.status(400).json({
            message: "Invalid restaurant ID"
        }).end()
    }
    dynamoDb.get({
        TableName: RESTAURANTS_TABLE_NAME,
        Key: {
            id: req.params.restaurantId
        }
    }, function(err, data) {
        if (err) {
            console.log(err)
            res.status(500).json({
                message: "Could not load restaurant"
            }).end()
        } else {
            if (data['Item']) {
                res.json(data['Item'])
            } else {
                res.status(404).json({
                    message: "The restaurant does not exist"
                })
            }
        }
    })
})

/***************************
 * Restaurant menu methods *
 ***************************/

app.get('/items/restaurants/:restaurantId/menu', function(req, res) {
    // lists all of the menu items for a restaurant.
    if (!req.params.restaurantId) {
        res.status(400).json({
            message: "Invalid restaurant ID"
        }).end()
    }
    dynamoDb.query({
        TableName: MENU_TABLE_NAME,
        KeyConditions: {
            restaurant_id: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [ req.params.restaurantId]
            }
        }
    }, function(err, data) {
        if (err) {
            console.log(err)
            res.status(500).json({
                message: "Could not load restaurant menu"
            }).end()
        } else {
            res.json(data['Items'])
        }
    })
})

app.get('/items/restaurants/:restaurantId/menu/:itemId', function(req, res) {
    // extracts the details of a specific menu item
    if (!req.params.restaurantId || !req.params.itemId) {
        res.status(400).json({
            message: "Invalid restaurant or item identifier"
        }).end()
    }
    dynamoDb.get({
        TableName: MENU_TABLE_NAME,
        Key: {
            restaurant_id: req.params.restaurantId,
            id: req.params.itemId
        }
    }, function(err, data) {
        if (err) {
            console.log(err)
            res.status(500).json({
                message: "Could not load menu item"
            }).end()
        } else {
            if (data['Item']) {
                res.json(data['Item'])
            } else {
                // return 404 if we couldn't find the menu item in the database
                res.status(404).json({
                    message: "The menu item does not exist"
                })
            }
        }
    })
})

module.exports = app
