"use strict";

var p = require("./predicates.js");
var utils = require("./utils.js");

module.exports = {
  "number": p.isNumber,
  "integer": p.isInteger,
  "nat": function (val) {
    return p.isInteger(val) && p.isNonNegative(val);
  },
  "positive": function (val, valueCheck) {
    return p.isPositive(val) && (!valueCheck || valueCheck(val));
  },
  "nonnegative": function (val, valueCheck) {
    return p.isNonNegative(val) && (!valueCheck || valueCheck(val));
  },
  "finite": function (val, valueCheck) {
    return p.isFinite(val) && (!valueCheck || valueCheck(val));
  },
  "boolean": p.isBoolean,
  "string": p.isString,
  "date": p.isDate,
  "regexp": p.isRegExp,
  "function": p.isFunction,
  "array": function (arr, valueCheck) {
    return p.isArray(arr) && (!valueCheck || arr.every(valueCheck));
  },
  "map": function (map, valueCheck) {
    return p.isObject(map) && (!valueCheck || utils.values(map).every(valueCheck));
  },
  "tuple": function (v) {
    if (!Array.isArray(v)) { return false; }
    var args = Array.prototype.slice.call(arguments, 1);
    if (args.length !== v.length) { return false; }
    for (var i = 0; i < args.length; i++) {
      if (!args[i](v[i])) {
        return false;
      }
    }
    return true;
  },
};
