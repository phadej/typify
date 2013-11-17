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

function manyLoop(res, a, tokens, idx) {
  while (true) {
    var aq = a(tokens, idx);
    if (aq === undefined) { return [res, idx]; }
    res.push(aq[0]);
    idx = aq[1];
  }
}

function some(a) {
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

function many(a) {
  return function (tokens, idx) {
    a = force(a);
    var res = [];
    return manyLoop(res, a, tokens, idx);
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