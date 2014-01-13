/*
* typify
* https://github.com/phadej/typify
*
* Copyright (c) 2013 Oleg Grenrus
* Licensed under the MIT license.
*/
"use strict";

var utils = require("./utils.js");
var p = require("./predicates.js");
var A = require("./aparser.js");
var c = require("./checkableCompiler.js");
var cons = require("./checkableConstructors.js");

// Few almost predicates
function constFalse() {
  return false;
}

var functionP = require("./functionParser.js").functionP;

var functionTypeCheckRe = /^([a-zA-Z_][a-zA-Z0-9_]*|"[^"]*"|'[^']*'|[0-9]+|\*|\?|\||&|\(|\)|\{|\}|::|:|,|=>|->|\.\.\.|\s+)*$/;
var functionTypeTokenRe = /([a-zA-Z_][a-zA-Z0-9_]*|"[^"]*"|'[^']*'|[0-9]+|\*|\?|\||&|\(|\)|\{|\}|::|:|,|=>|->|\.\.\.)/g;

// Checkable type parsing, check pre-compiling and pretty-printing

var parseCheckableType = require("./checkableParser").parse;
var compileCheckableType = require("./checkableCompiler.js").compile;
var compileCheckableTypeRecursive = require("./checkableCompiler.js").compileRecursive;

var show = require("./show.js");

// Function type parsing, checks pre-compiling & pretty-printing

function optional(parsed) {
  if (parsed.type === "any") { return true; }
  if (parsed.type === "opt") { return true; }
  if (parsed.type === "alt") { return parsed.options.some(optional); }
  return false;
}

function maxParamsF(parsed) {
  return parsed.rest === undefined ? parsed.params.length : Infinity;
}

function minParamsF(parsed) {
  var result = parsed.params.length;
  for (var i = result - 1; i >= 0; i--) {
    if (!optional(parsed.params[i])) {
      break;
    }
    result = i;
  }
  return result;
}

function compileContext(environment, context) {
  var res = {};
  for (var varname in context) {
    res[varname] = context[varname].map(compileCheckableType.bind(undefined, environment, context));
  }
  return res;
}

function parseFunctionType(type) {
  if (!p.isString(type)) { throw new TypeError("signature should be string"); }
  if (!functionTypeCheckRe.test(type)) { throw new TypeError("invalid function type: " + type); }
  var tokens = type.match(functionTypeTokenRe);
  var parsed = A.parse(functionP, tokens);
  if (parsed === undefined) { throw new TypeError("invalid function type: " + type); }
  return parsed;
}

function compileFunctionType(environment, parsed) {
  return {
    name: parsed.name,
    context: compileContext(environment, parsed.context),
    params: parsed.params.map(compileCheckableType.bind(undefined, environment, parsed.context)),
    rest: parsed.rest && compileCheckableType(environment, parsed.context, parsed.rest),
    result: compileCheckableType(environment, parsed.context, parsed.result),
    minParams: minParamsF(parsed),
    maxParams: maxParamsF(parsed),
  };
}

function contextCheckGeneric(context, varname, arg) {
  var options = context[varname];
  // console.log("contextCheckTemplate", context, varname, options, arg);
  if (Array.isArray(options)) {
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var res = option(context, arg);
      if (res) {
        context[varname] = option;
        return true;
      }
    }
    return false;
  } else {
    return options(context, arg);
  }
}

// Decorate function with type-signature check
function decorate(environment, type, method) {
  var parsed = parseFunctionType(type);
  var compiled = compileFunctionType(environment, parsed);

  return function() {
    // check there are enough parameters
    if (arguments.length < compiled.minParams || arguments.length > compiled.maxParams) {
      if (compiled.minParams === compiled.maxParams) {
        throw new TypeError("function " + compiled.name + " expects " + compiled.maxParams + " arguments, " + arguments.length + " given");
      } else {
        throw new TypeError("function " + compiled.name + " expects " + compiled.minParams + "-" + compiled.maxParams + " arguments, " + arguments.length + " given");
      }
    }

    var contextCheck = contextCheckGeneric.bind(undefined, utils.copyObj(compiled.context));

    // check that parameters are of right type
    for (var i = 0; i < arguments.length; i++) {
      var check = i < compiled.params.length ? compiled.params[i] : compiled.rest;
      var argType =  i < compiled.params.length ? parsed.params[i] : parsed.rest;
      if (!check(contextCheck, arguments[i])) {
        // TODO: str checkable type
        throw new TypeError("type of " + parsed.name + " " + (i+1) + ". parameter is not `" + show.checkable(argType) + "` in context `" + show.context(parsed.context) + "` -- " + JSON.stringify(arguments[i]));
      }
    }

    // call original function
    var r = method.apply(this, arguments);

    // check type of return value
    if (!compiled.result(contextCheck, r)) {
      // TODO: str checkable type
      throw new TypeError("type of `" + parsed.name + "` return value is not `" + show.checkable(parsed.result) + "` in context `" + show.context(parsed.context) + "` -- " + r);
    }

    // return
    return r;
  };
}

// Add checkable type
function addType(environment, name, check) {
  if (environment.has(name)) { throw new Error(name + " is already defined"); }

  environment.set(name, check);
}

// Check checkable type
function check(environment, type, variable) {
  if (arguments.length !== 2 && arguments.length !== 3) {
    throw new TypeError("check takes 1 or 2 arguments, " + (arguments.length-1) + " provided");
  }

  var parsed = parseCheckableType(type);
  // console.log(parsed);
  // console.log(JSON.stringify(parsed, null));
  var compiled = compileCheckableType(environment, {}, parsed); // using empty context

  switch (arguments.length) {
    case 2: return function (variable1) {
      return compiled(constFalse, variable1);
    };
    case 3:
      return compiled(constFalse, variable);
  }
}

function record(environment, name, definition) {
  var fields = {};
  for (var k in definition) {
    if (utils.has(definition, k)) {
      fields[k] = parseCheckableType(definition[k]);
    }
  }

  var type = cons.record(fields);
  var compiled = c.compileRecord(environment, {}, [name], type);

  // record check function is fixpoint of just defined `check`
  var checks = {};
  checks[name] = compiled.bind(undefined, checks, constFalse);
  environment.add(checks);
}

function mutual(environment, definitions) {
  var names = Object.keys(definitions);

  var compiled = {};
  var checks = {};

  // compile & bind
  names.forEach(function (name) {
    var parsed = parseCheckableType(definitions[name]);
    var check = compileCheckableTypeRecursive(environment, {}, names, parsed);
    compiled[name] = check;
    checks[name] = check.bind(undefined, compiled, constFalse);
  });

  environment.add(checks);
}

function adt(environment, name, definitions) {
  var constructors = Object.keys(definitions);

  var adtDefinitions = {};
  adtDefinitions[name] = constructors.join(" | ");

  constructors.forEach(function (constructor) {
    adtDefinitions[constructor] = definitions[constructor];
  });

  return mutual(environment, adtDefinitions);
}

function instance(environment, name, cls) {
  environment.set(name, function (arg) {
    return arg instanceof cls;
  });
}

function alias(environment, name, definition) {
  var definitions = {};
  definitions[name] = definition;
  mutual(environment, definitions);
}

function wrap(environment, module, signatures) {
  for (var fn in signatures) {
    module[fn] = decorate(environment, fn + " :: " + signatures[fn], module[fn]);
  }

  return module;
}

var buildInTypes = require("./builtin.js");

function Environment() {
  this.types = {};
}

Environment.prototype.has = function environmentHas(type) {
  return utils.has(this.types, type) || utils.has(buildInTypes, type);
};

Environment.prototype.get = function environmentGet(type) {
  return this.types[type] || buildInTypes[type];
};

Environment.prototype.set = function environmentSet(type, checkF) {
  this.types[type] = checkF;
};

Environment.prototype.add = function environmentAdd(checks) {
  Object.keys(checks).forEach(function (type) {
    this.types[type] = checks[type];
  }, this);
};

// typify public API type signatures
var TYPE_SIGNATURES = {
  type: "string -> fn -> *",
// TODO: support alternative function signatures
// TODO: support specifying required but "any" parameter
//  check: "string -> * -> boolean",
  alias: "string -> string -> *",
  record: "string -> map string -> *",
  mutual: "map string -> *",
  instance: "string -> fn -> *",
  wrap: "* -> map string -> *",
  adt: "string -> map string -> *",
};

// Create typify
// We could want use prototype-style, instead of closure, but we cannot make callable objects.
// TODO: add reference
function create() {
  var env = new Environment();

  var typify = decorate.bind(undefined, env);
  typify.type = addType.bind(undefined, env);
  typify.check = check.bind(undefined, env);
  typify.alias = alias.bind(undefined, env);
  typify.record = record.bind(undefined, env);
  typify.mutual = mutual.bind(undefined, env);
  typify.instance = instance.bind(undefined, env);
  typify.wrap = wrap.bind(undefined, env);
  typify.adt = adt.bind(undefined, env);

  // also add recursive create
  // make recursive environments or just possible to merge types from old?
  typify.create = create;

  return typify.wrap(typify, TYPE_SIGNATURES);
}

// Export  stuff
module.exports = create();
