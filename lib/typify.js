/*
 * typify
 * https://github.com/phadej/typify
 *
 * Copyright (c) 2013 Oleg Grenrus
 * Licensed under the MIT license.
 */
(function () {
  "use strict";

  // Does the object contain given key? http://underscorejs.org/#has
  function has(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
  }

  // Create a shallow-copied clone of the object. http://underscorejs.org/#clone
  function copyObj(obj) {
    var res = {};
    for (var k in obj) {
      res[k] = obj[k];
    }
    return res;
  }

  // 
  function values(obj) {
    var res = [];
    for (var k in obj) {
      if (has(obj, k)) {
        res.push(obj[k]);
      }
    }
    return res;
  }

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

  // Thunk, for the lazy-evaluation and recursive parser.
  function Thunk(f) {
    this.thunk = f;
    this.forced = false;
    this.value = undefined;
  }

  function delay(f) {
    return new Thunk(f);
  }

  function force(thunk) {
    if (thunk instanceof Thunk) {
      if (!thunk.forced) {
        thunk.value = thunk.thunk();
        thunk.forced = true;
      }
      return thunk.value;
    } else {
      return thunk;
    }
  }

  // Applicative parser framework
  var A = (function () {
     // Error used by our parser.
    function ParseError(message) {
        this.name = "ParseError";
        this.message = (message || "");
    }
    ParseError.prototype = Error.prototype;

    function parse(p, tokens) {
      var res = p(tokens, 0);
      // console.log("parse", res, tokens, tokens.length);
      if (res !== undefined && res[1] >= tokens.length) {
        return res[0];
      } else {
        return undefined;
      }
    }

    function eof(tokens, idx) {
      // console.log("eof", tokens, idx);
      if (idx < tokens.length) {
        return undefined;
      } else {
        return [undefined, idx];
      }
    }

    function token(tok) {
      return function (tokens, idx) {
        // console.log("token", tokens, idx, tok);
        if (idx >= tokens.length) { return undefined; }
        if (tokens[idx] === tok) {
          return [tok, idx+1];
        } else {
          return undefined;
        }
      };
    }

    function satisfying(predicate) {
      return function (tokens, idx) {
        // console.log("satisfying", predicate.name || predicate, tokens, idx);
        if (idx >= tokens.length) { return undefined; }
        if (predicate(tokens[idx])) {
          return [tokens[idx], idx+1];
        } else {
          return undefined;
        }
      };
    }

    function any() {
      return function (tokens, idx) {
        if (idx < tokens.length) {
          return [tokens[idx], idx+1];
        } else {
          return undefined;
        }
      };
    }

    function pure(x) {
      return function (tokens, idx) {
        return [x, idx];
      };
    }

    function or() {
      var args = Array.prototype.slice.call(arguments);
      var len = args.length;
      return function (tokens, idx) {
        for (var i = 0; i < len; i++) {
          var res = force(args[i])(tokens, idx);
          if (res !== undefined) { return res; }
        }
        return undefined;
      };
    }

    function lift() {
      var len = arguments.length - 1;
      var f = arguments[len];
      var args = Array.prototype.slice.call(arguments, 0, -1);
      return function(tokens, idx) {
        var resargs = new Array(len);
        for (var i = 0; i < len; i++) {
          var res = force(args[i])(tokens, idx);
          // console.log("lift argument:", res, force(args[i]));
          if (res === undefined) { return undefined; }
          resargs[i] = res[0];
          idx = res[1];
        }
        // console.log("lift value", f.apply(undefined, resargs), idx);
        return [f.apply(undefined, resargs), idx];
      };
    }

    function some(a) {
      return function (tokens, idx) {
        a = force(a);
        var res = [];
        var ap = a(tokens, idx);
        if (ap === undefined) { return undefined; }
        res.push(ap[0]);
        idx = ap[1];
        while (true) {
          var aq = a(tokens, idx);
          if (aq === undefined) { return [res, idx]; }
          res.push(aq[0]);
          idx = aq[1];
        }
      };
    }

    function many(a) {
      return function (tokens, idx) {
        a = force(a);
        var res = [];
        while (true) {
          var aq = a(tokens, idx);
          if (aq === undefined) { return [res, idx]; }
          res.push(aq[0]);
          idx = aq[1];
        }
      };
    }

    function sepBy(a, sep, transform) {
      return function (tokens, idx) {
        a = force(a);
        var res = [];
        var ap = a(tokens, idx);
        if (ap === undefined) { return undefined; }
        res.push(ap[0]);
        idx = ap[1];
        while (true) {
          if (tokens[idx] !== sep) { return [res, idx]; }
          idx += 1;
          var aq = a(tokens, idx);
          if (aq === undefined) { return [res, idx]; }
          res.push(aq[0]);
          idx = aq[1];
        }
      };
    }

    function optional(p, def) {
      return function (tokens, idx) {
        var res = force(p)(tokens, idx);
        if (res === undefined) {
          return [def, idx];
        } else {
          return res;
        }
      };
    }

    return {
      parse: parse,
      pure: pure,
      or: or,
      lift: lift,
      many: many,
      some: some,
      sepBy: sepBy,
      eof: eof,
      token: token,
      any: any,
      satisfying: satisfying,
      optional: optional,
    };
  }());

  var checkableTypeCheckRe = /^([a-zA-Z]+|\*|\?|\||\(|\)|\s+)*$/;
  var checkableTypeTokenRe = /([a-zA-Z]+|\*|\?|\||\(|\))/g;

  var functionTypeCheckRe = /^([a-zA-Z]+|\*|\?|\||\(|\)|::|:|,|=>|->|\.\.\.|\s+)*$/;
  var functionTypeTokenRe = /([a-zA-Z]+|\*|\?|\||\(|\)|::|:|,|=>|->|\.\.\.)/g;

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

  var termP = A.or(anyP, varP, parensP(delay(function () { return altP; })));

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

  altP = A.lift(A.sepBy(polyP, "|"), function (options) {
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

  var typesetP = A.sepBy(optP, "|");

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

  // map used to save type checkers
  var types = {};

  // Checkable type parsing, check pre-compiling and pretty-printing
  function parseCheckableType(type) {
     if (!checkableTypeCheckRe.test(type)) { throw new TypeError("invalid checkable type: " + type); }
    var tokens = type.match(checkableTypeTokenRe);
    var parsed = A.parse(altP, tokens);
     if (parsed === undefined) { throw new TypeError("invalid checkable type: " + type); }
     return parsed;
  }

  function compileCheckableType(context, parsed) {
    if (parsed.type === "var") {
      if (has(context, parsed.name)) {
        return function (varCheck, arg) {
          // console.log("varcheck", varCheck, arg);
          return varCheck(parsed.name, arg);
        };
      } else if (has(types, parsed.name)) {
        var check = types[parsed.name];
        return function (varCheck, arg) {
          return check(arg);
        };
      } else {
        throw new Error("unknown type: " + parsed.name);
      }
    } else if (parsed.type === "poly") {
      if (has(types, parsed.name)) {
        var polyCheck = types[parsed.name];
        var args = parsed.args.map(compileCheckableType.bind(undefined, context));
        return function (varCheck, arg) {
          var argsChecks = args.map(function (argCheck) {
            return argCheck.bind(undefined, varCheck);
          });
          return polyCheck.apply(undefined, [arg].concat(argsChecks));
        };
      } else {
        throw new Error("unknown type: " + parsed.name);
      }
    } else if (parsed.type === "any") {
      return constTrue;
    } else if (parsed.type === "opt") {
      var c = compileCheckableType(context, parsed.term);
      return function (varCheck, arg) {
        return arg === undefined || c(varCheck, arg);
      };
    } else if (parsed.type === "alt") {
      var cs = parsed.options.map(compileCheckableType.bind(undefined, context));
      return function (varCheck, arg) {
        return cs.some(function (c) {
          return c(varCheck, arg);
        });
      };
    } else {
      throw new Error("unknown type type:" + parsed.type);
    }
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
    } else if (type.type === "poly") {
      return parensS(precedence > 1,
        type.name + " " + type.args.map(showCheckableTypePrecedence.bind(undefined, 2)).join(" "));
    } else if (type.type === "opt") {
      return parensS(precedence > 2,
        showCheckableTypePrecedence(type.term) + "?");
    }
  }

  // Function type parsing, checks pre-compiling & pretty-printing
  function showContext(context) {
    var res = "";
    for (var name in context) {
      if (has(context, name)) {
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

  function compileContext(context) {
    var res = {};
    for (var varname in context) {
      res[varname] = context[varname].map(compileCheckableType.bind(undefined, context));
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

  function compileFunctionType(parsed) {
    return {
      name: parsed.name,
      context: compileContext(parsed.context),
      params: parsed.params.map(compileCheckableType.bind(null, parsed.context)),
      rest: parsed.rest && compileCheckableType(parsed.context, parsed.rest),
      result: compileCheckableType(parsed.context, parsed.result),
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
  function typify(type, method) {
    var parsed = parseFunctionType(type);
    var compiled = compileFunctionType(parsed);

    return function() {
      // check there are enough parameters
      if (arguments.length < compiled.minParams || arguments.length > compiled.maxParams) {
        if (compiled.minParams === compiled.maxParams) {
          throw new TypeError("function " + compiled.name + " expects " + compiled.maxParams + " arguments, " + arguments.length + " given");
        } else {
          throw new TypeError("function " + compiled.name + " expects " + compiled.minParams + "-" + compiled.maxParams + " arguments, " + arguments.length + " given");
        }
      }

      var contextCheck = contextCheckGeneric.bind(undefined, copyObj(compiled.context));

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
  function type(name, check) {
    if (!isString(name)) { throw new TypeError("1st parameter's type expected to be string"); }
    if (!isFunction(check)) { throw new TypeError("2nd parameter's type expected to be function"); }
    if (has(types, type)) { throw new Error(name + " is already defined"); }

    types[name] = check;
  }

  // Check checkable type
  function check(type, variable) {
    var parsed = parseCheckableType(type);
    // console.log(parsed);
    // console.log(JSON.stringify(parsed, null));
    var compiled = compileCheckableType({}, parsed); // using empty context
    return compiled(constFalse, variable);
  }

  function record(name, definition) {
    var checks = {};
    for (var k in definition) {
      if (has(definition, k)) {
        var parsed = parseCheckableType(definition[k]);
        checks[k] = compileCheckableType({}, parsed);
      }
    }

    types[name] = function (arg) {
      if (!isObject(arg)) {
        return false;
      }

      for (var k in checks) {
        if (has(checks, k)) {
          if (!checks[k](constFalse, arg[k])) {
            return false;
          }
        }
      }
      return true;
    };
  }

  // Export  stuff
  typify.type = type;
  typify.check = check;
  typify.record = record;

  // Type definitions
  type("null", isNull);
  type("number", isNumber);
  type("boolean", isBoolean);
  type("string", isString);
  type("date", isDate);
  type("regexp", isRegExp);
  type("function", isFunction);
  type("array", function (arr, valueCheck) {
    return isArray(arr) && (!valueCheck || arr.every(valueCheck));
  });
  type("map", function (map, valueCheck) {
    return isObject(map) && (!valueCheck || values(map).every(valueCheck));
  });

  /* global window, exports */
  if (typeof window !== "undefined") {
    window.typify = typify;
  } else if (typeof exports !== "undefined") {
    exports.typify = typify;
  }
}());
