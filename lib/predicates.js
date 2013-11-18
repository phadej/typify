"use strict";

// Type predicates
function isBoolean(val) {
  return typeof val === "boolean";
}

function isNumber(val) {
  return typeof val === "number";
}

function isInteger(val) {
  return val === (val|0);
}

function isPositive(val) {
  return typeof val === "number" && val > 0;
}

function isNonNegative(val) {
  return typeof val === "number" && val >= 0;
}

function isFinite(val) {
  return typeof val === "number" && val !== Infinity && val !== -Infinity && val === +val;
}

function isString(val) {
  return typeof val === "string";
}

function isFunction(val) {
  return typeof val === "function";
}

function isDate(val) {
  return val instanceof Date;
}

function isRegExp(val) {
  return val instanceof RegExp;
}

function isArray(val) {
  return Array.isArray(val);
}

function isObject(val) {
  return Object(val) === val;
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
};