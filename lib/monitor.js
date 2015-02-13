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
                console.warn("[redis-ring]",{
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
                console.error("[redis-ring]", details, message);
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

module.exports = monitor;