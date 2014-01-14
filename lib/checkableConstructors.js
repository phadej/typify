"use strict";

var assert = require("assert");

var any = { type: "any" };

function variable(name) {
  switch (name) {
    case "true": return { type: "literal", value: true };
    case "false": return { type: "literal", value: false };
    case "null": return { type: "literal", value: null };
    case "infinity": return { type: "literal", value: Infinity };
    case "ninfinity": return { type: "literal", value: -Infinity };
    case "undefined": return { type: "literal", value: undefined };
    case "nan": return { type: "literal", value: NaN };
  }
  return { type: "var", name: name };
}

function number(value) {
  assert(typeof value === "number");
  return { type: "literal", value: value };
}

function string(value) {
  assert(typeof value === "string");
  return { type: "literal", value: value };
}

function opt(t) {
  if (t.type === "any") {
    return t;
  } else if (t.type === "opt") {
    return t;
  } else {
    return { type: "opt", term: t };
  }
}

function poly(name, args) {
  return { type: "poly", name: name, args: args };
}

function record(fields) {
  return { type: "record", fields: fields };
}

function mergeOptions(type, a, b) {
  if (a.type === type) {
    if (b.type === type) {
      return a.options.concat(b.options);
    } else {
      return a.options.concat([b]);
    }
  } else {
    if (b.type === type) {
      return [a].concat(b.options);
    } else {
      return [a, b];
    }
  }
}

function andOr(type, options) {
  assert(options.length > 0);

  if (options.length === 1) {
    return options[0];
  }

  return options.reduce(function (a, b) {
    return {
      type: type,
      options: mergeOptions(type, a, b),
    };
  });
}

function user(predicate) {
  return { type: "user", predicate: predicate };
}

module.exports = {
  any: any,
  variable: variable,
  number: number,
  string: string,
  opt: opt,
  poly: poly,
  record: record,
  and: andOr.bind(undefined, "and"),
  alt: andOr.bind(undefined, "alt"),
  user: user,
};
