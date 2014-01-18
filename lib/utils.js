"use strict";

// Does the object contain given key? http://underscorejs.org/#has
// :: map -> string -> boolean
function has(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

// :: array -> any -> boolean
function contains(array, element) {
  return array.indexOf(element) !== -1;
}

// Create a shallow-copied clone of the object. http://underscorejs.org/#clone
// :: map -> map
function copyObj(obj) {
  var res = {};
  for (var k in obj) {
    res[k] = obj[k];
  }
  return res;
}

// Returns values of the object
// :: map -> array
function values(obj) {
  var res = [];
  for (var k in obj) {
    if (has(obj, k)) {
      res.push(obj[k]);
    }
  }
  return res;
}

// :: map -> fn -> map
function mapValues(obj, f) {
  var res = {};
  for (var k in obj) {
    if (has(obj, k)) {
      res[k] = f(obj[k]);
    }
  }
  return res;
}

// :: array|arguments -> integer? -> integer? -> array
function slice(array, n, m) {
  return Array.prototype.slice.call(array, n, m);
}

// :: array -> fn -> array
function map(array, f) {
  return array.map(function (x) {
    return f(x);
  });
}

// This has different semantics than Array#every
// utils.every([1, 2, 3], function (x) { return x; }); // 3
// [1, 2, 3].every(function (x) { return x; }); // true
// :: array -> fn -> *
function every(array, f) {
  var acc = true;
  for (var i = 0; i < array.length; i++) {
    acc = acc && f(array[i]);
    if (!acc) {
      return acc;
    }
  }
  return acc;
}

// :: fn -> fn
function y(f) {
  // :: fn -> fn
  function p(h) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      return f.apply(undefined, [h(h)].concat(args));
    };
  }
  return p(p);
}

// try { throw new Error(); } catch (e) { console.log(e.stack); }

module.exports = {
  has: has,
  contains: contains,
  copyObj: copyObj,
  values: values,
  mapValues: mapValues,
  slice: slice,
  map: map,
  every: every,
  y: y,
};
