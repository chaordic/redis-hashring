var constants = require("./constants");

var Monitor = function(client) {

    var m = {
            up: true,
            client: client,
            threshold: 0
        },

        ts,

        up = function() {
            if (!m.up) {
                m.up = true;
                // TODO Add event to this kind of thing
            }
            m.threshold = 0;
            ts = undefined;
        },

        down = function(details, message) {
            m.threshold = m.threshold + 1;

            if (m.up && m.threshold >= constants.THRESHOLD) {
                details.node = {
                    port: client.port,
                    host: client.host
                };

                m.up = false;
                ts = new Date().getTime();
                // TODO Add event to this kind of thing
            }
        },

        check = function() {
            var start = new Date().getTime();

            client.ping(function(e, d) {
                var elapsed = new Date().getTime() - start;
                if (elapsed > constants.TIMEOUT) {
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

                setTimeout(check, constants.HEART_BEAT);
            });

        };

    client.on("error", function(e) {
        down({ error: e }, "Redis node is down!");
    });

    check();

    return m;
};


module.exports = Monitor;
