"use strict";

var utils = require("./utils.js");
var p = require("./predicates.js");

// Forward declaration
var compileCheckableTypeRecursive;

// :: Environment -> map (array checkable) -> array string -> checkableAlt | checkableAnd -> fn
function compileAndAlt(environment, context, recNames, parsed, operator) {
  var cs = utils.map(parsed.options, compileCheckableTypeRecursive.bind(undefined, environment, context, recNames));
  // compiledOptAlt :: map fn -> fn -> any -> fn... -> boolean
  operator = parsed.type === "and" ? "every" : "some";
  return function (recChecks, varCheck, arg) {
    return cs[operator](function (c) {
      return c(recChecks, varCheck, arg);
    });
  };
}

// :: Environment -> map (array checkable) -> array string -> checkableVar -> fn
function compileVar(environment, context, recNames, parsed) {
  if (utils.has(context, parsed.name)) {
    // compiledContext :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      // console.log("varcheck", varCheck, arg);
      return varCheck(parsed.name, arg);
    };
  } else if (environment.has(parsed.name)) {
    var check = environment.get(parsed.name);
    // compiledEnv :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck) {
      var args = utils.slice(arguments, 2);
      return check.apply(undefined, args);
    };
  } else if (recNames && utils.contains(recNames, parsed.name)) {
    // compiledRec :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      return recChecks[parsed.name](recChecks, varCheck, arg);
    };
  } else {
    throw new Error("unknown type: " + parsed.name);
  }
}

// :: Environment -> map (array checkable) -> array string -> checkablePoly -> fn
function compilePoly(environment, context, recNames, parsed) {
  var args = utils.map(parsed.args, compileCheckableTypeRecursive.bind(undefined, environment, context, recNames));
  if (utils.has(context, parsed.name)) {
    // compiledPoly :: map fn -> fn -> any -> fn... -> boolean
    return function compiledPolyEnv(recChecks, varCheck, arg) {
      var argsChecks = args.map(function (argCheck) {
        return argCheck.bind(undefined, recChecks, varCheck);
      });
      return varCheck.apply(undefined, [parsed.name, arg].concat(argsChecks));
    };
  } else if (environment.has(parsed.name)) {
    var polyCheck = environment.get(parsed.name);
    // compiledPoly :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      var argsChecks = args.map(function (argCheck) {
        return argCheck.bind(undefined, recChecks, varCheck);
      });
      return polyCheck.apply(undefined, [arg].concat(argsChecks));
    };
  } else {
    throw new Error("unknown type: " + parsed.name);
  }
}

// :: Environment -> map (array checkable) -> array string -> checkableOpt -> fn
function compileOpt(environment, context, recNames, parsed) {
  var c = compileCheckableTypeRecursive(environment, context, recNames, parsed.term);
  // compiledOpt :: map fn -> fn -> any -> fn... -> boolean
  return function (recChecks, varCheck, arg) {
    return arg === undefined || c(recChecks, varCheck, arg);
  };
}

// :: Environment -> map (array checkable) -> array string -> checkableLiteral -> fn
function compileLiteral(environment, context, recNames, parsed) {
  if (parsed.value !== parsed.value) {
    // NaN
    // compiledNaN :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      return arg !== arg;
    };
  } else {
    // compiledLiteral :: map fn -> fn -> any -> fn... -> boolean
    return function (recChecks, varCheck, arg) {
      return arg === parsed.value;
    };
  }
}

// :: Environment -> map (array checkable) -> array string -> checkableRecord -> fn
function compileRecord(environment, context, recNames, parsed) {
  var fields = {};
  for (var name in parsed.fields) {
    fields[name] = compileCheckableTypeRecursive(environment, context, recNames, parsed.fields[name]);
  }
  var closed = parsed.closed;

  // compiledRecord : map fn -> fn -> any -> fn... -> boolean
  return function (recChecks, varCheck, arg) {
    if (!p.isObject(arg)) {
      return false;
    }

    for (var fieldName in fields) {
      if (!fields[fieldName](recChecks, varCheck, arg[fieldName])) {
        return false;
      }
    }

    if (closed) {
      for (var key in arg) {
        if (!fields[key]) {
          return false;
        }
      }
    }

    return true;
  };
}

// :: Environment -> map (array checkable) -> array string -> checkableUser -> fn
function compileUser(environment, context, recNames, parsed) {
  // compiledUser :: map fn -> fn -> any -> fn... -> boolean
  return function (recChecks, varCheck, arg) {
    return parsed.predicate(arg);
  };
}

// :: Environment -> map (array checkable) -> array string -> checkable -> fn
function compileCheckableTypeRecursive(environment, context, recNames, parsed) {
  switch (parsed.type) {
    case "var": return compileVar(environment, context, recNames, parsed);
    case "literal": return compileLiteral(environment, context, recNames, parsed);
    case "poly": return compilePoly(environment, context, recNames, parsed);
    case "any": return p.constTrue;
    case "opt": return compileOpt(environment, context, recNames, parsed);
    case "alt": return compileAndAlt(environment, context, recNames, parsed);
    case "and": return compileAndAlt(environment, context, recNames, parsed);
    case "record": return compileRecord(environment, context, recNames, parsed);
    case "user": return compileUser(environment, context, recNames, parsed);
  }
}

// :: Environment -> map (array checkable) -> checkable -> fn
function compileCheckableType(environment, context, parsed) {
  return compileCheckableTypeRecursive(environment, context, [], parsed).bind(undefined, {});
}

module.exports = {
  compile: compileCheckableType,
  compileRecursive: compileCheckableTypeRecursive,
  compileRecord: compileRecord,
};
