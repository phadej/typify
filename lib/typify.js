/*
* typify
* https://github.com/phadej/typify
*
* Copyright (c) 2013 Oleg Grenrus
* Licensed under the MIT license.
*/
"use strict";

var utils = require("./utils.js");

// Few almost predicates
function constFalse() {
  return false;
}

function constTrue() {
  return true;
}

// Type predicates
function isNull(val) {
  return val === null;
}

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

// Applicative parser framework
var A = require("./aparser.js");

var checkableTypeCheckRe = /^([a-zA-Z]+|\*|\?|\||&|\(|\)|\s+)*$/;
var checkableTypeTokenRe = /([a-zA-Z]+|\*|\?|\||&|\(|\))/g;

var functionTypeCheckRe = /^([a-zA-Z]+|\*|\?|\||&|\(|\)|::|:|,|=>|->|\.\.\.|\s+)*$/;
var functionTypeTokenRe = /([a-zA-Z]+|\*|\?|\||&|\(|\)|::|:|,|=>|->|\.\.\.)/g;

var identifierRe = /^[a-zA-Z]+$/;

function isIdentifier(token) {
  return identifierRe.test(token);
}

var altP;

function parensP(p) {
  return A.lift(A.token("("), p, A.token(")"), function(a, b, c) {
    return b;
  });
}

var identifierP = A.satisfying(isIdentifier);

var anyP = A.lift(A.token("*"), function () {
  return {
    type: "any",
  };
});

var varP = A.lift(identifierP, function (name) {
  return {
    type: "var",
    name: name,
  };
});

var termP = A.or(anyP, varP, parensP(A.delay(function () { return altP; })));

var optP = A.lift(termP, A.optional(A.token("?")), function (term, opt) {
  if (opt === "?" && term.type !== "opt" && term.type !== "any") {
     return {
      type: "opt",
      term: term,
    };
  } else {
    return term;
  }
});

var polyP1 = A.lift(identifierP, A.some(optP), function (name, args) {
  return {
    type: "poly",
    name: name,
    args: args,
  };
});

var polyP = A.or(polyP1, optP);

var andP = A.lift(A.sepBy(polyP, "&"), function (options) {
  return options.reduce(function (a, b) {
    var options;
    if (a.type === "and") {
      if (b.type === "and") {
        options = a.options.concat(b.options);
      } else {
        options = a.options.concat([b]);
      }
    } else {
      if (b.type === "and") {
        options = [a].concat(b.options);
      } else {
        options = [a, b];
      }
    }

    return {
      type: "and",
      options: options,
    };
  });
});

altP = A.lift(A.sepBy(andP, "|"), function (options) {
  return options.reduce(function (a, b) {
    var options;
    if (a.type === "alt") {
      if (b.type === "alt") {
        options = a.options.concat(b.options);
      } else {
        options = a.options.concat([b]);
      }
    } else {
      if (b.type === "alt") {
        options = [a].concat(b.options);
      } else {
        options = [a, b];
      }
    }

    return {
      type: "alt",
      options: options,
    };
  });
});

var nameP = A.optional(A.lift(identifierP, A.token("::"), function (identifier, sep) {
  return identifier;
}), "");

var actionP = A.lift(nameP, A.token("->"), altP, function (name, arrow, result) {
  return {
    name: name,
    context: {},
    params: [],
    rest: undefined,
    result: result,
  };
});

var typesetP = A.sepBy(polyP, "|");

var contextDefP = A.lift(identifierP, A.token(":"), typesetP, function (name, sep, typeset) {
  // console.log("contextDefP", name, typeset);
  return {
    name: name,
    typeset: typeset,
  };
});

var contextP = A.optional(A.lift(A.sepBy(contextDefP, ","), A.token("=>"), function (defs, arrow) {
  return defs.reduce(function (context, def) {
    context[def.name] = def.typeset;
    return context;
  }, {});
}), {});

var paramsP = A.many(A.lift(altP, A.token("->"), function (param, arrow) {
  return param;
}));

var restP = A.optional(A.lift(A.optional(altP), A.token("..."), A.token("->"), function (type, ellipsis, arrow) {
  // console.log("restP", type, ellipsis, arrow);
  return type || { type: "any" };
}));

var functionTypeP1 = A.lift(nameP, contextP, paramsP, restP, altP, function (name, context, params, rest, result) {
  // console.log("functionTypeP1", name, context, params, rest, result);
  return {
    name: name,
    context: context,
    params: params,
    rest: rest,
    result: result,
  };
});

var functionTypeP = A.or(actionP, functionTypeP1);

// Checkable type parsing, check pre-compiling and pretty-printing
function parseCheckableType(type) {
   if (!checkableTypeCheckRe.test(type)) { throw new TypeError("invalid checkable type: " + type); }
  var tokens = type.match(checkableTypeTokenRe);
  var parsed = A.parse(altP, tokens);
   if (parsed === undefined) { throw new TypeError("invalid checkable type: " + type); }
   return parsed;
}

function compileCheckableTypeRecursive(environment, context, recName, parsed) {
  var cs;

  if (parsed.type === "var") {
    if (utils.has(context, parsed.name)) {
      return function (recCheck, varCheck, arg) {
        // console.log("varcheck", varCheck, arg);
        return varCheck(parsed.name, arg);
      };
    } else if (environment.has(parsed.name)) {
      var check = environment.get(parsed.name);
      return function (recCheck, varCheck, arg) {
        return check(arg);
      };
    } else if (parsed.name === recName) {
      return function (recCheck, varCheck, arg) {
        return recCheck(recCheck, varCheck, arg);
      };
    } else {
      throw new Error("unknown type: " + parsed.name);
    }
  } else if (parsed.type === "poly") {
    if (environment.has(parsed.name)) {
      var polyCheck = environment.get(parsed.name);
      var args = parsed.args.map(compileCheckableTypeRecursive.bind(undefined, environment, context, recName));
      return function (recCheck, varCheck, arg) {
        var argsChecks = args.map(function (argCheck) {
          return argCheck.bind(undefined, recCheck, varCheck);
        });
        return polyCheck.apply(undefined, [arg].concat(argsChecks));
      };
    } else {
      throw new Error("unknown type: " + parsed.name);
    }
  } else if (parsed.type === "any") {
    return constTrue;
  } else if (parsed.type === "opt") {
    var c = compileCheckableTypeRecursive(environment, context, recName, parsed.term);
    return function (recCheck, varCheck, arg) {
      return arg === undefined || c(recCheck, varCheck, arg);
    };
  } else if (parsed.type === "alt") {
    cs = parsed.options.map(compileCheckableTypeRecursive.bind(undefined, environment, context, recName));
    return function (recCheck, varCheck, arg) {
      return cs.some(function (c) {
        return c(recCheck, varCheck, arg);
      });
    };
  } else if (parsed.type === "and") {
    cs = parsed.options.map(compileCheckableTypeRecursive.bind(undefined, environment, context, recName));
    return function (recCheck, varCheck, arg) {
      return cs.every(function (c) {
        return c(recCheck, varCheck, arg);
      });
    };
  } else {
    throw new Error("unknown type type:" + parsed.type);
  }
}

function compileCheckableType(environment, context, parsed) {
  return compileCheckableTypeRecursive(environment, context, undefined, parsed).bind(undefined, undefined);
}

function parensS(guard, str) {
  return guard ? "(" + str + ")" : str;
}

function showCheckableTypePrecedence(precedence, type) {
  if (type.type === "any") {
    return "*";
  } else if (type.type === "var") {
    return type.name;
  } else if (type.type === "alt") {
    return parensS(precedence > 0,
      type.options.map(showCheckableTypePrecedence.bind(undefined, 0)).join("|"));
  } else if (type.type === "and") {
    return parensS(precedence > 1,
      type.options.map(showCheckableTypePrecedence.bind(undefined, 1)).join("&"));
  } else if (type.type === "poly") {
    return parensS(precedence > 2,
      type.name + " " + type.args.map(showCheckableTypePrecedence.bind(undefined, 3)).join(" "));
  } else if (type.type === "opt") {
    return parensS(precedence > 3,
      showCheckableTypePrecedence(3, type.term) + "?");
  }
}

// Function type parsing, checks pre-compiling & pretty-printing
function showContext(context) {
  var res = "";
  for (var name in context) {
    if (utils.has(context, name)) {
      res += name + " : " + context[name].map(showCheckableTypePrecedence.bind(undefined, 1)).join(" | ");
    }
  }
  return res;
}

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
  if (!isString(type)) { throw new TypeError("signature should be string"); }
  if (!functionTypeCheckRe.test(type)) { throw new TypeError("invalid function type: " + type); }
  var tokens = type.match(functionTypeTokenRe);
  var parsed = A.parse(functionTypeP, tokens);
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
      var type =  i < compiled.params.length ? parsed.params[i] : parsed.rest;
      if (!check(contextCheck, arguments[i])) {
        // TODO: str checkable type
        throw new TypeError("type of " + parsed.name + " " + (i+1) + ". parameter is not `" + showCheckableTypePrecedence(0, type) + "` in context `" + showContext(parsed.context) + "` -- " + JSON.stringify(arguments[i]));
      }
    }

    // call original function
    var r = method.apply(this, arguments);

    // check type of return value
    if (!compiled.result(contextCheck, r)) {
      // TODO: str checkable type
      throw new TypeError("type of `" + parsed.name + "` return value is not `" + showCheckableTypePrecedence(0, parsed.result) + "` in context `" + showContext(parsed.context) + "` -- " + r);
    }

    // return
    return r;
  };
}

// Add checkable type
function type(environment, name, check) {
  if (!isString(name)) { throw new TypeError("1st parameter's type expected to be string"); }
  if (!isFunction(check)) { throw new TypeError("2nd parameter's type expected to be function"); }
  if (environment.has(type)) { throw new Error(name + " is already defined"); }

  environment.set(name, check);
}

// Check checkable type
function check(environment, type, variable) {
  var parsed = parseCheckableType(type);
  // console.log(parsed);
  // console.log(JSON.stringify(parsed, null));
  var compiled = compileCheckableType(environment, {}, parsed); // using empty context

  if (arguments.length === 2) {
    return function (variable1) {
      return compiled(constFalse, variable1);
    };
  } else if (arguments.length === 3) {
    return compiled(constFalse, variable);
  } else {
    // environment is always binded
    throw new Error("check takes 1 or 2 arguments, " + arguments.length + " provided");
  }
}

function record(environment, name, definition) {
  var checks = {};
  for (var k in definition) {
    if (utils.has(definition, k)) {
      var parsed = parseCheckableType(definition[k]);
      checks[k] = compileCheckableTypeRecursive(environment, {}, name, parsed);
    }
  }

  function check(recCheck, varCheck, arg) {
    if (!isObject(arg)) {
      return false;
    }

    for (var k in checks) {
      if (utils.has(checks, k)) {
        if (!checks[k](recCheck, varCheck, arg[k])) {
          return false;
        }
      }
    }
    return true;
  }

  // record check function is fixpoint of just defined `check`
  environment.set(name, check.bind(undefined, check, constFalse));
}

function alias(environment, name, definition) {
  var parsed = parseCheckableType(definition);
  var check = compileCheckableTypeRecursive(environment, {}, name, parsed);

  environment.set(name, check.bind(undefined, check, constFalse));
}

var buildInTypes = {
  "null": isNull,
  "number": isNumber,
  "integer": isInteger,
  "nat": function (val) {
    return isInteger(val) && isNonNegative(val);
  },
  "positive": function (val, valueCheck) {
    return isPositive(val) && (!valueCheck || valueCheck(val));
  },
  "nonnegative": function (val, valueCheck) {
    return isNonNegative(val) && (!valueCheck || valueCheck(val));
  },
  "finite": function (val, valueCheck) {
    return isFinite(val) && (!valueCheck || valueCheck(val));
  },
  "boolean": isBoolean,
  "string": isString,
  "date": isDate,
  "regexp": isRegExp,
  "function": isFunction,
  "array": function (arr, valueCheck) {
    return isArray(arr) && (!valueCheck || arr.every(valueCheck));
  },
  "map": function (map, valueCheck) {
    return isObject(map) && (!valueCheck || utils.values(map).every(valueCheck));
  }
};

function Environment() {
  this.types = {};
}

Environment.prototype.has = function environmentHas(type) {
  return utils.has(this.types, type) || utils.has(buildInTypes, type);
};

Environment.prototype.get = function environmentGet(type) {
  return this.types[type] || buildInTypes[type];
};

Environment.prototype.set = function environmentSet(type, check) {
  this.types[type] = check;
};

// Create typify
// We could want use prototype-style, instead of closure, but we cannot make callable objects.
// TODO: add reference
function create() {
  var env = new Environment();

  var typify = decorate.bind(undefined, env);
  typify.type = type.bind(undefined, env);
  typify.check = check.bind(undefined, env);
  typify.alias = alias.bind(undefined, env);
  typify.record = record.bind(undefined, env);

  // also add recursive create
  // make recursive environments or just possible to merge types from old?
  typify.create = create;

  return typify;
}

// Export  stuff
var typify = create();
module.exports = typify;
