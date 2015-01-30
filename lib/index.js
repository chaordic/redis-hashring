var
    redis = require("redis"),
    crypto = require("crypto"),
    bignumber = require("bignumber"),
    futures = require("futures"),

    lib = process.cwd() + "/lib/",

    rta = require(lib + "rta/rta"),
    environment = require(lib + "util/environment.js"),
    log = require(lib + "log/logger");

var TIMEOUT = 1000;
var HEART_BEAT = 500;
var THRESHOLD = 5;

var monitor = function(client) {

    var m = {
            up: true,
            client: client,
            threshold: 0
        },

        ts,

        up = function() {
            if (!m.up) {
                m.up = true;
                log.warn({
                    node: {
                        port: client.port,
                        host: client.host
                    },
                    downtime: new Date().getTime() - ts
                }, "Redis node is back online.");
            }
            m.threshold = 0;
            ts = undefined;
        },

        down = function(details, message) {
            m.threshold = m.threshold + 1;

            if (m.up && m.threshold >= THRESHOLD) {
                details.node = {
                    port: client.port,
                    host: client.host
                };

                m.up = false;
                ts = new Date().getTime();
                log.error(details, message);
                rta.incr("market", "redis.down");
            }
        },

        check = function() {
            var start = new Date().getTime();

            client.ping(function(e, d) {
                var elapsed = new Date().getTime() - start;
                if (elapsed > TIMEOUT) {
                    down({ error: e, elapsed: elapsed }, "Redis node timeout!");
                } else {
                    if (e) {
                        down({ error: e, elapsed: elapsed }, "Redis node ping error!");
                    } else {
                        if (d === "PONG") {
                            up();
                        } else {
                            down({ error: e, elapsed: elapsed }, "Redis node is down!");
                        }
                    }
                }

                setTimeout(check, HEART_BEAT);
            });

        };

    client.on("error", function(e) {
        down({ error: e }, "Redis node is down!");
    });

    check();

    return m;
};

var monitors = (function(ring) {
    if (typeof ring === "string") {
        ring = [ring];
    }

    return ring.map(function(node) {
        var parts = node.split(":");
        var host = parts.shift();
        var port = Number(parts.join("") || 6379);

        return monitor(redis.createClient(port, host));
    });
}(environment.redis));

var md5 = function(k) {
    var hash = crypto.createHash('md5');
    hash.update(k);
    return hash.digest("hex");
};

var monitorsLength = new bignumber.BigInteger(String(monitors.length), 10);

var ring = {
    getClient: monitors.length === 0?
        function (k) {
            log.error("No redis nodes available!");
        }:
        function(k) {
            var hash = md5(k);
            var n = new bignumber.BigInteger(hash, 16);
            var pos = n.mod(monitorsLength).intValue();
            var startPos = pos;
            var node;

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
                    log.error("No redis nodes available!");
                    return;
                }
            }
        },

    getFirstClient: monitors.length === 0 ?
        function (k) {
            log.error("No redis nodes available!");
        }:
        function() {
            return monitors[0].client;
        },

    initialize: function() {
        var future = futures.future.create();

        var ts = new Date().getTime();

        var check = function() {
            if (monitors.some(function(m) { return m.up; })) {
                future.fulfill();
            } else {
                if (new Date().getTime() - ts > TIMEOUT) {
                    future.fulfill(new Error("Failed to initialize RedisRing"));
                } else {
                    setTimeout(check, HEART_BEAT);
                }
            }
        };

        check();

        return future;
    }
};


module.exports = ring;