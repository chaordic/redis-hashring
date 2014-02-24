function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

define("TIMEOUT", 1000);
define("HEART_BEAT", 500);
define("THRESHOLD", 5);
