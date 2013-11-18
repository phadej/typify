"use strict";

var utils = require("./utils.js");
var p = require("./predicates.js");

function constTrue() {
  return true;
}

// forward declaration
var compileCheckableTypeRecursive;

function compileAndAlt(environment, context, recName, parsed, operator) {
  var cs = parsed.options.map(compileCheckableTypeRecursive.bind(undefined, environment, context, recName));
  return function (recCheck, varCheck, arg) {
    return cs[operator](function (c) {
      return c(recCheck, varCheck, arg);
    });
  };
}

function compileVar(environment, context, recName, parsed) {
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
}

function compilePoly(environment, context, recName, parsed) {
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
}

function compileOpt(environment, context, recName, parsed) {
  var c = compileCheckableTypeRecursive(environment, context, recName, parsed.term);
  return function (recCheck, varCheck, arg) {
    return arg === undefined || c(recCheck, varCheck, arg);
  };
}

function compileLiteral(environment, context, recName, parsed) {
  return function (recCheck, varCheck, arg) {
    return arg === parsed.value;
  };
}

function compileRecord(environment, context, recName, parsed) {
  var fields = {};
  for (var name in parsed.fields) {
    if (utils.has(parsed.fields, name)) {
      fields[name] = compileCheckableTypeRecursive(environment, context, recName, parsed.fields[name]);
    }
  }
  return function (recCheck, varCheck, arg) {
    if (!p.isObject(arg)) {
      return false;
    }

    for (var name in fields) {
      if (utils.has(fields, name)) {
        if (!fields[name](recCheck, varCheck, arg[name])) {
          return false;
        }
      }
    }

    return true;
  };
}

function compileCheckableTypeRecursive(environment, context, recName, parsed) {
  switch (parsed.type) {
    case "var": return compileVar(environment, context, recName, parsed);
    case "literal": return compileLiteral(environment, context, recName, parsed);
    case "poly": return compilePoly(environment, context, recName, parsed);
    case "any": return constTrue;
    case "opt": return compileOpt(environment, context, recName, parsed);
    case "alt": return compileAndAlt(environment, context, recName, parsed, "some");
    case "and": return compileAndAlt(environment, context, recName, parsed, "every");
    case "record": return compileRecord(environment, context, recName, parsed);
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