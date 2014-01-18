"use strict";

var utils = require("./utils.js");

// typify: instance Thunk

// Thunk, for the lazy-evaluation and recursive parser.
// :: fn -> undefined
function Thunk(f) {
  this.thunk = f;
  this.forced = false;
  this.value = undefined;
}

// :: any -> Thunk
function delay(f) {
  return new Thunk(f);
}

// :: any -> *
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

// :: fn -> array string -> *
function parse(p, tokens) {
  var res = p(tokens, 0);
  // console.log("parse", res, tokens, tokens.length);
  if (res !== undefined && res[1] >= tokens.length) {
    return res[0];
  } else {
    return undefined;
  }
}

// :: array string -> nat -> (tuple undefined idx)?
function eof(tokens, idx) {
  // console.log("eof", tokens, idx);
  if (idx < tokens.length) {
    return undefined;
  } else {
    return [undefined, idx];
  }
}

// :: string -> fn
function token(tok) {
  // :: array string -> nat -> (tuple string nat)?
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

// :: fn -> fn
function satisfying(predicate) {
  // :: array string -> nat -> (tuple string nat)?
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

// :: -> fn
function any() {
  // :: array string -> nat -> (tuple string nat)?
  return function (tokens, idx) {
    if (idx < tokens.length) {
      return [tokens[idx], idx+1];
    } else {
      return undefined;
    }
  };
}

// :: * -> fn
function pure(x) {
  // :: array string -> nat -> tuple * nat
  return function (tokens, idx) {
    return [x, idx];
  };
}

// :: fn... -> fn
function or() {
  var args = utils.slice(arguments);
  var len = args.length;
  // :: array string -> nat -> (tuple * nat)?
  return function (tokens, idx) {
    for (var i = 0; i < len; i++) {
      var res = force(args[i])(tokens, idx);
      if (res !== undefined) { return res; }
    }
    return undefined;
  };
}

// :: fn | Thunk ... -> fn
function lift() {
  var len = arguments.length - 1;
  var f = arguments[len];
  var args = utils.slice(arguments, 0, -1);
  // :: array string -> nat -> (tuple * nat)?
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

// :: array -> * -> array string -> nat -> tuple array nat
function manyLoop(res, a, tokens, idx) {
  while (true) {
    var aq = a(tokens, idx);
    if (aq === undefined) { return [res, idx]; }
    res.push(aq[0]);
    idx = aq[1];
  }
}

// :: fn -> fn
function some(a) {
  // :: array string -> nat -> (tuple array nat)?
  return function (tokens, idx) {
    a = force(a);
    var res = [];
    var ap = a(tokens, idx);
    if (ap === undefined) { return undefined; }
    res.push(ap[0]);
    idx = ap[1];
    return manyLoop(res, a, tokens, idx);
  };
}

// :: fn -> fn
function many(a) {
  // :: array string -> nat -> tuple array nat
  return function (tokens, idx) {
    a = force(a);
    var res = [];
    return manyLoop(res, a, tokens, idx);
  };
}

// :: fn -> string -> fn
function sepBy(a, sep) {
  // :: array string -> nat -> (tuple array nat)?
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

// :: fn -> * -> fn
function optional(p, def) {
  // :: array string -> nat -> (tuple * nat)?
  return function (tokens, idx) {
    var res = force(p)(tokens, idx);
    if (res === undefined) {
      return [def, idx];
    } else {
      return res;
    }
  };
}

module.exports = {
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
  delay: delay,
};
