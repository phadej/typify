"use strict";

var assert = require("assert");

var any = { type: "any" };

/*
  typify: adt checkable
    checkableAny:     { type: 'any' }
    checkableLiteral: { type: 'literal', value: string|number|boolean|null|undefined|nan }
    checkableVar:     { type: 'var', name: string }
    checkableRecord:  { type: 'record', fields: map checkable, closed: boolean }
    checkablePoly:    { type: 'poly', name: string, args: array checkable }
    checkableAlt:     { type: 'alt', options: array checkable }
    checkableAnd:     { type: 'and', options: array checkable }
    checkableOpt:     { type: 'opt', term: checkable }
    checkableUser:    { type: 'user', predicate: fn }
*/

// typify: type contextDef = { name: string, typeset: array checkable }
// typify: type context = map (array checkable)
// typify: type functionType = { name: string, context: context, params: array checkable, rest: checkable?, result: checkable }

// :: string -> { type: 'literal', value: null|boolean|infinity|ninfinity|undefined|nan } | checkableVar
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

// :: number -> { type: 'literal', value: number }
function number(value) {
  assert(typeof value === "number");
  return { type: "literal", value: value };
}

// :: string -> { type: 'literal', value: string }
function string(value) {
  assert(typeof value === "string");
  return { type: "literal", value: value };
}

// :: checkable -> checkableOpt | checkableAny
function opt(t) {
  if (t.type === "any") {
    return t;
  } else if (t.type === "opt") {
    return t;
  } else {
    return { type: "opt", term: t };
  }
}

// :: string -> array checkable -> checkablePoly
function poly(name, args) {
  return { type: "poly", name: name, args: args };
}

// :: map checkable -> boolean -> checkableRecord
function record(fields, closed) {
  return { type: "record", fields: fields, closed: !!closed };
}

// :: 'and'|'alt' -> checkable -> checkable -> checkable | array checkable
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

// :: 'and'|'alt' -> array checkable -> checkable
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

// :: fn -> checkableUser
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
