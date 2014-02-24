var
    redis = require("redis"),
    crypto = require("crypto"),
    bignumber = require("bignumber"),
    constants = require("./constants"),
    to_array = require("./to_array"),
    monitor = require("./monitor");

var commands = require("./commands");

var RedisHashring = function() {

    var monitors,
        monitorsLength,
        readyStateHandler,
        stateReady = false;

    var md5 = function(k) {
        var hash = crypto.createHash('md5');
        hash.update(k);
        return hash.digest("hex");
    };

    var initializeMonitors = function(ring) {
        if (typeof ring === "string") {
            ring = [ring];
        }

        return ring.map(function(node) {
            var parts = node.split(":");
            var host = parts.shift();
            var port = Number(parts.join("") || 6379);

            return monitor(redis.createClient(port, host));
        });
    };

    RedisHashring.prototype.getClient = function(k) {
        var hash, n, pos, startPos, node;
        if (monitors.length === 0) {
            throw new Error("No redis nodes available");
        } else {
            hash = md5(k);
            n = new bignumber.BigInteger(hash, 16);
            pos = n.mod(monitorsLength).intValue();
            startPos = pos;
            node;

            while (true) {
                node = monitors[pos];
                if (node.up) {
                    return node.client;
                }

                pos += 1;
                if (pos === monitors.length) {
                    pos = 0;
                }

                if (pos === startPos) {
                    throw new Error("No redis nodes available");
                }
            }
        }
    };

    RedisHashring.prototype.getFirstClient = function() {
        if (monitors.length === 0) {
            throw new Error("No redis nodes available");
        } else {
            return monitors[0].client;
        }

    };

    RedisHashring.prototype.executeCommand = function(command, args, callback) {
        var client = this.getClient(args[0]);
        client.send_command(command, args, callback);
    };

    RedisHashring.prototype.ready = function(callback) {
        readyStateHandler = callback;
        if (stateReady) {
            readyStateHandler();
        }
    }

    RedisHashring.prototype.initialize = function(redisAddresses) {
        var ts = new Date().getTime();

        monitors = initializeMonitors(redisAddresses);
        monitorsLength = new bignumber.BigInteger(String(monitors.length), 10);

        var check = function() {
            if (monitors.some(function(m) { return m.up; })) {
                stateReady = true;
                if (typeof readyStateHandler === "function") {
                    readyStateHandler();
                }
            } else {
                if (new Date().getTime() - ts > constants.TIMEOUT) {
                    throw new Error("Failed to initialize RedisHashring");
                } else {
                    setTimeout(check, constants.HEART_BEAT);
                }
            }
        };

        check();
    };

    commands.forEach(function (fullCommand) {
        var command = fullCommand.split(' ')[0];

        RedisHashring.prototype[command] = function (args, callback) {
            if (Array.isArray(args) && typeof callback === "function") {
                return this.executeCommand(command, args, callback);
            } else {
                return this.executeCommand(command, to_array(arguments));
            }
        };
        RedisHashring.prototype[command.toUpperCase()] = RedisHashring.prototype[command];

    });

};

module.exports = RedisHashring;
