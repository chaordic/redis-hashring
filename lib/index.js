var Promise = require("bluebird");
var redis = require("redis");
var bignumber = require("bignumber");

var commands = require("./commands");
var monitor = require("./monitor");
var md5 = require("./md5");

var TIMEOUT = 1000;
var HEART_BEAT = 500;
var THRESHOLD = 5;

var Annulus = function(endpoints) {
    this._monitors = (function(endpoints) {
        return endpoints.map(function(endpoint) {
            return monitor(redis.createClient(endpoint.port || 6379, endpoint.host || "localhost"));
        });
    }(endpoints));

    this._monitorsLength = new bignumber.BigInteger(String(this._monitors.length), 10);
};

Annulus.prototype._getClient = function(key) {
    var hash = md5(key);
    var n = new bignumber.BigInteger(hash, 16);
    var pos = n.mod(this._monitorsLength).intValue();
    var startPos = pos;
    var node;

    while (true) {
        node = this._monitors[pos];
        if (node.up) {
            return node.client;
        }

        pos += 1;
        if (pos === this._monitors.length) {
            pos = 0;
        }

        if (pos === startPos) {
            // log.error("No redis nodes available!");
            return;
        }
    }
};

Annulus.prototype._call = function(command, args) {
    var client = this._getClient(args[0]);

    return new Promise(function(resolve, reject) {
        args.push(function(err, reply) {
            if (err) {
                return reject(err);
            }

            resolve(reply);
        });

        client[command].apply(client, args);
    });
};

commands.forEach(function(command) {
    Annulus.prototype[command] = function() {
        var args = Array.prototype.slice.call(arguments);

        return this._call(command, args);
    };
});

module.exports = Annulus;
