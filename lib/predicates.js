"use strict";

// Type predicates
var toString = Object.prototype.toString;

// :: any -> boolean
function isBoolean(val) {
  return typeof val === "boolean";
}

// :: any -> boolean
function isNumber(val) {
  return typeof val === "number";
}

// :: any -> boolean
function isInteger(val) {
  return val === (val|0);
}

// :: any -> boolean
function isPositive(val) {
  return typeof val === "number" && val > 0;
}

// :: any -> boolean
function isNonNegative(val) {
  return typeof val === "number" && val >= 0;
}

// :: any -> boolean
function isFinite(val) {
  return typeof val === "number" && val !== Infinity && val !== -Infinity && val === +val;
}

// :: any -> boolean
function isString(val) {
  return typeof val === "string";
}

// :: any -> boolean
function isFunction(val) {
  return typeof val === "function";
}

// :: any -> boolean
function isDate(val) {
  return toString.call(val) === "[object Date]";
}

// :: any -> boolean
function isRegExp(val) {
  return toString.call(val) === "[object RegExp]";
}

// :: any -> boolean
function isArray(val) {
  return Array.isArray(val);
}

// :: any -> boolean
function isObject(val) {
  return Object(val) === val;
}

// :: any -> boolean
function isArguments(val) {
  return val && isObject(arguments) && isInteger(val.length) && Object.prototype.toString.call(val) === "[object Arguments]" || false;
}

// :: *... -> true
function constTrue() {
  return true;
}

module.exports = {
  isBoolean: isBoolean,
  isNumber: isNumber,
  isInteger: isInteger,
  isPositive: isPositive,
  isNonNegative: isNonNegative,
  isFinite: isFinite,
  isString: isString,
  isFunction: isFunction,
  isDate: isDate,
  isRegExp: isRegExp,
  isArray: isArray,
  isObject: isObject,
  isArguments: isArguments,
  constTrue: constTrue,
};
