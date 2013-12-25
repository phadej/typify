"use strict";

// Does the object contain given key? http://underscorejs.org/#has
function has(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

// Create a shallow-copied clone of the object. http://underscorejs.org/#clone
function copyObj(obj) {
  var res = {};
  for (var k in obj) {
    res[k] = obj[k];
  }
  return res;
}

// Returns values of the object
function values(obj) {
  var res = [];
  for (var k in obj) {
    if (has(obj, k)) {
      res.push(obj[k]);
    }
  }
  return res;
}

module.exports = {
  has: has,
  copyObj: copyObj,
  values: values,
};
