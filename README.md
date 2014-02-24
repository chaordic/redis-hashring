redis-hashring
==========

This project allows you to create an Redis cluster. It uses the key passed on parameters to generate a hash to decide in which instance it should read or write the data.

## Usage

Quick example using two Redis instances:

```js
var RedisRing = require("");

var redisRing = new RedisRing();

redisRing.initialize(["localhost", "localhost:7777"]);

redisRing.ready(function() {
    var key = "somekey",
        key2 = "otherkey";

    redisRing.set(key, "Value", function(err, val) {
        redisRing.get(key, function(err, val) {
            console.log(err, val);
        })
    });

    redisRing.set(key2, "Value2", function(err, val) {
        redisRing.get(key2, function(err, val) {
            console.log(err, val);
        })
    });

});


```
