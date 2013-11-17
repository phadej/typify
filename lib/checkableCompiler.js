"use strict";

var utils = require("./utils.js");

function constTrue() {
  return true;
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

module.exports = {
	compile: compileCheckableType,
	compileRecursive: compileCheckableTypeRecursive,
};