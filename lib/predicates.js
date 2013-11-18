"use strict";

// Type predicates

// :: * -> boolean
function isBoolean(val) {
  return typeof val === "boolean";
}

// :: * -> boolean
function isNumber(val) {
  return typeof val === "number";
}

// :: * -> boolean
function isInteger(val) {
  return val === (val|0);
}

// :: * -> boolean
function isPositive(val) {
  return typeof val === "number" && val > 0;
}

// :: * -> boolean
function isNonNegative(val) {
  return typeof val === "number" && val >= 0;
}

// :: * -> boolean
function isFinite(val) {
  return typeof val === "number" && val !== Infinity && val !== -Infinity && val === +val;
}

// :: * -> boolean
function isString(val) {
  return typeof val === "string";
}

// :: * -> boolean
function isFunction(val) {
  return typeof val === "function";
}

// :: * -> boolean
function isDate(val) {
  return val instanceof Date;
}

// :: * -> boolean
function isRegExp(val) {
  return val instanceof RegExp;
}

// :: * -> boolean
function isArray(val) {
  return Array.isArray(val);
}

// :: * -> boolean
function isObject(val) {
  return Object(val) === val;
}

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
