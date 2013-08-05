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
      if (has(context, parsed.name)) {
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
    return compiled(constFalse, variable);
  }

  function record(environment, name, definition) {
    var checks = {};
    for (var k in definition) {
      if (has(definition, k)) {
        var parsed = parseCheckableType(definition[k]);
        checks[k] = compileCheckableTypeRecursive(environment, {}, name, parsed);
      }
    }

    function check(recCheck, varCheck, arg) {
      if (!isObject(arg)) {
        return false;
      }

      for (var k in checks) {
        if (has(checks, k)) {
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

  var buildInTypes = {
    "null": isNull,
    "number": isNumber,
    "boolean": isBoolean,
    "string": isString,
    "date": isDate,
    "regexp": isRegExp,
    "function": isFunction,
    "array": function (arr, valueCheck) {
      return isArray(arr) && (!valueCheck || arr.every(valueCheck));
    },
    "map": function (map, valueCheck) {
      return isObject(map) && (!valueCheck || values(map).every(valueCheck));
    }
  };

  function Environment() {
    this.types = {};
  }

  Environment.prototype.has = function environmentHas(type) {
    return has(this.types, type) || has(buildInTypes, type);
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
    typify.record = record.bind(undefined, env);

    // also add recursive create
    // make recursive environments or just possible to merge types from old?
    typify.create = create;

    return typify;
  }

  // Export  stuff
  var typify = create();

  /* global window, module */
  if (typeof window !== "undefined") {
    window.typify = typify;
  } else if (typeof module !== "undefined" && module.exports !== "undefined") {
    module.exports = typify;
  }
}());
