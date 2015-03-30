/*
* typify
* https://github.com/phadej/typify
*
* Copyright (c) 2013 Oleg Grenrus
* Licensed under the MIT license.
*/
"use strict";

var VERSION = [0, 2, 9];

var utils = require("./utils.js");
var p = require("./predicates.js");
var A = require("./aparser.js");
var c = require("./checkableCompiler.js");
var cons = require("./checkableConstructors.js");
var show = require("./show.js");
var parseCheckableType = require("./checkableParser").parse;
var compileCheckableType = c.compile;
var compileCheckableTypeRecursive = c.compileRecursive;
var functionP = require("./functionParser.js").functionP;

// Few almost predicates
// :: *... -> *
function throwAlways() {
  throw new Error("this shouldn't been called");
}

var functionTypeCheckRe = /^([a-zA-Z_][a-zA-Z0-9_]*|"[^"]*"|'[^']*'|[0-9]+|\*|\?|\||&|\(|\)|\{|\}|::|:|,|=>|->|\.\.\.|\s+)*$/;
var functionTypeTokenRe = /([a-zA-Z_][a-zA-Z0-9_]*|"[^"]*"|'[^']*'|[0-9]+|\*|\?|\||&|\(|\)|\{|\}|::|:|,|=>|->|\.\.\.)/g;

// Function type parsing, checks pre-compiling & pretty-printing

// :: checkable -> *... -> boolean
function optional(parsed) {
  if (parsed.type === "any") { return true; }
  if (parsed.type === "opt") { return true; }
  if (parsed.type === "alt") { return parsed.options.some(optional); }
  return false;
}

// :: functionType -> nat | infinity
function maxParamsF(parsed) {
  return parsed.rest === undefined ? parsed.params.length : Infinity;
}

// :: functionType -> nat
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

// :: Environment -> map (array checkable) -> map (array fn)
function compileContext(environment, context) {
  return utils.mapValues(context, function (v) {
    return utils.map(v, compileCheckableType.bind(undefined, environment, context));
  });
}

// :: string -> functionType
function parseFunctionType(type) {
  if (!functionTypeCheckRe.test(type)) { throw new TypeError("invalid function type: " + type); }
  var tokens = type.match(functionTypeTokenRe);
  var parsed = A.parse(functionP, tokens);
  if (parsed === undefined) { throw new TypeError("invalid function type: " + type); }
  return parsed;
}

// :: Environment -> functionType -> *
function compileFunctionType(environment, parsed) {
  return {
    name: parsed.name,
    context: compileContext(environment, parsed.context),
    params: utils.map(parsed.params, compileCheckableType.bind(undefined, environment, parsed.context)),
    rest: parsed.rest && compileCheckableType(environment, parsed.context, parsed.rest),
    result: compileCheckableType(environment, parsed.context, parsed.result),
    minParams: minParamsF(parsed),
    maxParams: maxParamsF(parsed),
  };
}

// :: map (array fn) -> fn -> string -> *... ->  boolean
function contextCheckGeneric(context, compiled, varname) {
  var options = context[varname];
  var args = utils.slice(arguments, 3);

  for (var i = 0; i < options.length; i++) {
    var option = options[i];
    var res = option.apply(undefined, [compiled].concat(args));
    if (res) {
      context[varname] = [option];
      return true;
    }
  }
  return false;
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

    var contextCheckUn = contextCheckGeneric.bind(undefined, utils.copyObj(compiled.context));
    var contextCheck = utils.y(contextCheckUn);

    // check that parameters are of right type
    for (var i = 0; i < arguments.length; i++) {
      var argCheck = i < compiled.params.length ? compiled.params[i] : compiled.rest;
      var argType =  i < compiled.params.length ? parsed.params[i] : parsed.rest;
      if (!argCheck(contextCheck, arguments[i])) {
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

// typify: type checkableEmbedded = string | fn | array checkableEmbedded | map checkableEmbedded
// :: checkableEmbedded -> boolean? -> checkable
function parse(definition, closed) {
  if (p.isString(definition)) {
    return parseCheckableType(definition);
  } else if (p.isFunction(definition)) {
    return cons.user(definition);
  } else if (p.isArray(definition)) {
    var options = utils.map(definition, parse);
    return cons.alt(options);
  } else /* if (p.isObject(definition)) */ {
    var fields = utils.mapValues(definition, parse);
    return cons.record(fields, closed);
  }
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
      return compiled(throwAlways, variable1) === true;
    };
    case 3:
      return compiled(throwAlways, variable) === true;
  }
}

function assert(environment, type, variable) {
  if (arguments.length !== 2 && arguments.length !== 3) {
    throw new TypeError("assert takes 1 or 2 arguments, " + (arguments.length-1) + " provided");
  }

  var parsed = parseCheckableType(type);
  // console.log(parsed);
  // console.log(JSON.stringify(parsed, null));
  var compiled = compileCheckableType(environment, {}, parsed); // using empty context

  switch (arguments.length) {
    case 2: return function (variable1) {
      var result1 = compiled(throwAlways, variable1);
      if (result1 !== true) {
        throw new TypeError(result1);
      }
    };
    case 3:
      var result = compiled(throwAlways, variable);
      if (result !== true) {
        throw new TypeError(result);
      }
  }
}

// Add single parsable type
// :: Environment -> map checkable -> undefined
function addParsedTypes(environment, parsed, closed) {
  var names = Object.keys(parsed);
  names.forEach(function (name) {
    if (environment.has(name)) { throw new Error(name + " is already defined"); }
  });

  var compiled = utils.mapValues(parsed, compileCheckableTypeRecursive.bind(undefined, environment, {}, names));
  var checks = utils.mapValues(compiled, function (check) {
    return check.bind(undefined, compiled, throwAlways);
  });

  environment.add(checks);
}

function addType(environment, name, definition, closed) {
  var parsed = {};
  parsed[name] = parse(definition, closed);
  return addParsedTypes(environment, parsed);
}

// Or many simultanouslty
function mutual(environment, definitions) {
  var parsed = utils.mapValues(definitions, parse);
  return addParsedTypes(environment, parsed);
}

function adt(environment, name, definitions) {
  if (utils.has(definitions, name)) {
    throw new Error("adt and it's constructor cannot has the same name");
  }

  var constructors = Object.keys(definitions);
  var parsed = utils.mapValues(definitions, parse);
  parsed[name] = parse(constructors);

  return addParsedTypes(environment, parsed);
}

function instance(environment, name, cls) {
  return addType(environment, name, function (arg) {
    return arg instanceof cls;
  });
}

function wrap(environment, module, signatures) {
  for (var fn in signatures) {
    module[fn] = decorate(environment, fn + " :: " + signatures[fn], module[fn]);
  }

  return module;
}

var buildInTypes = require("./builtin.js");

// typify: instance Environment
// :: -> undefined
function Environment() {
  this.types = {};
}

Environment.prototype.has = function environmentHas(type) {
  return utils.has(this.types, type) || utils.has(buildInTypes, type);
};

Environment.prototype.get = function environmentGet(type) {
  return this.types[type] || buildInTypes[type];
};

Environment.prototype.add = function environmentAdd(checks) {
  Object.keys(checks).forEach(function (type) {
    this.types[type] = checks[type];
  }, this);
};

// typify public API type signatures
var TYPE_SIGNATURES = {
  // TODO: change fn to multi type and deprecate alias & record
  type: "string -> fn -> *",
// TODO: support alternative function signatures
// TODO: support specifying required but "any" parameter
//  check: "string -> * -> boolean",
  alias: "string -> string -> *",
  record: "string -> map string -> boolean? -> *",
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
  typify.alias = addType.bind(undefined, env);
  typify.record = addType.bind(undefined, env);
  typify.mutual = mutual.bind(undefined, env);
  typify.adt = adt.bind(undefined, env);
  typify.instance = instance.bind(undefined, env);
  typify.check = check.bind(undefined, env);
  typify.assert = assert.bind(undefined, env);
  typify.wrap = wrap.bind(undefined, env);
  typify.version = VERSION;

  // also add recursive create
  // make recursive environments or just possible to merge types from old?
  typify.create = create;

  return typify.wrap(typify, TYPE_SIGNATURES);
}

// Export  stuff
module.exports = create();
