"use strict";

var utils = require("./utils.js");
var p = require("./predicates.js");

function constTrue() {
  return true;
}

// forward declaration
var compileCheckableTypeRecursive;

function compileAndAlt(environment, context, recNames, parsed, operator) {
  var cs = parsed.options.map(compileCheckableTypeRecursive.bind(undefined, environment, context, recNames));
  return function (recChecks, varCheck, arg) {
    return cs[operator](function (c) {
      return c(recChecks, varCheck, arg);
    });
  };
}

function compileVar(environment, context, recNames, parsed) {
  if (utils.has(context, parsed.name)) {
    return function (recChecks, varCheck, arg) {
      // console.log("varcheck", varCheck, arg);
      return varCheck(parsed.name, arg);
    };
  } else if (environment.has(parsed.name)) {
    var check = environment.get(parsed.name);
    return function (recChecks, varCheck, arg) {
      return check(arg);
    };
  } else if (recNames && utils.contains(recNames, parsed.name)) {
    return function (recChecks, varCheck, arg) {
      return recChecks[parsed.name](recChecks, varCheck, arg);
    };
  } else {
    throw new Error("unknown type: " + parsed.name);
  }
}

function compilePoly(environment, context, recNames, parsed) {
  if (environment.has(parsed.name)) {
    var polyCheck = environment.get(parsed.name);
    var args = parsed.args.map(compileCheckableTypeRecursive.bind(undefined, environment, context, recNames));
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

function compileOpt(environment, context, recNames, parsed) {
  var c = compileCheckableTypeRecursive(environment, context, recNames, parsed.term);
  return function (recChecks, varCheck, arg) {
    return arg === undefined || c(recChecks, varCheck, arg);
  };
}

function compileLiteral(environment, context, recNames, parsed) {
  return function (recChecks, varCheck, arg) {
    return arg === parsed.value;
  };
}

function compileRecord(environment, context, recNames, parsed) {
  var fields = {};
  for (var name in parsed.fields) {
    fields[name] = compileCheckableTypeRecursive(environment, context, recNames, parsed.fields[name]);
  }
  return function (recChecks, varCheck, arg) {
    if (!p.isObject(arg)) {
      return false;
    }

    for (var name in fields) {
      if (!fields[name](recChecks, varCheck, arg[name])) {
        return false;
      }
    }

    return true;
  };
}

function compileCheckableTypeRecursive(environment, context, recNames, parsed) {
  switch (parsed.type) {
    case "var": return compileVar(environment, context, recNames, parsed);
    case "literal": return compileLiteral(environment, context, recNames, parsed);
    case "poly": return compilePoly(environment, context, recNames, parsed);
    case "any": return constTrue;
    case "opt": return compileOpt(environment, context, recNames, parsed);
    case "alt": return compileAndAlt(environment, context, recNames, parsed, "some");
    case "and": return compileAndAlt(environment, context, recNames, parsed, "every");
    case "record": return compileRecord(environment, context, recNames, parsed);
  }
}

function compileCheckableType(environment, context, parsed) {
  return compileCheckableTypeRecursive(environment, context, undefined, parsed).bind(undefined, undefined);
}

module.exports = {
  compile: compileCheckableType,
  compileRecursive: compileCheckableTypeRecursive,
  compileRecord: compileRecord,
};
