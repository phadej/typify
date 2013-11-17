/* global describe, it */

"use strict";

var assert = require("assert");
var parse = require("../lib/checkableParser.js").parse;
var show = require("../lib/show.js");
var jsc = require("jsverify");
var random = jsc._.random;

function assertC(from, expected) {
  var actual = show.checkable(parse(from));
  assert.strictEqual(actual, expected);
}

describe("show", function () {
  describe("checkable", function () {
    it("shows any", function () {
      assertC(" * ", "*");
    });

    it("shows var", function () {
      assertC("foo", "foo");
    });

    it("shows alt", function () {
      assertC("foo | bar", "foo|bar");
    });

    it("shows and", function () {
      assertC("foo & bar", "foo&bar");
    });

    it("shwos poly", function () {
      assertC("foo bar", "foo bar");
    });

    it("shows opt", function () {
      assertC("foo ?", "foo?");
    });

    it("parenthises", function () {
      assertC("foo (bar | baz)", "foo (bar|baz)");
    });
  });
});

function arbitraryArray(size, arbitrary) {
  size = 2 + random(0, size);
  var arr = [];
  for (var i = 0; i < size; i++) {
    arr.push(arbitrary());
  }
  return arr;
}

function makeOpt(term) {
  if (term.type === "opt") {
    return term;
  } else {
    return { type: "opt", term: term };
  }
}

function arbitraryCheckable(size) {
  var type;
  var idents = [ "foo", "bar", "baz", "quux" ];
  if (size === 0) {
    type = random(0, 5);

    switch (type) {
      case 0: return { type: "any" };
      default: return { type: "var", name: idents[random(0, idents.length - 1)] };
    }
  } else {
    type = random(0, 5);
    var arr = arbitraryArray(1, arbitraryCheckable.bind(undefined, size - 1));
    switch (type) {
      case 0: return { type: "any" };
      case 1: return { type: "var", name: idents[random(0, idents.length - 1)] };
      case 2: return { type: "alt", options: arr };
      case 3: return { type: "and", options: arr };
      case 4: return {
        type: "poly",
        name: idents[random(0, idents.length - 1)],
        args: arr,
      };
      case 5: return makeOpt(arbitraryCheckable(size - 1));
    }
  }
}

var checkableGen = {
  arbitrary: arbitraryCheckable,
  shrink: function () { return []; },
  show: JSON.stringify,
};

describe("show + parse", function () {
  it("show . parse . show . parse . show = show . parse . show", function () {
    function normalize(t) {
      return parse(show.checkable(t));
    }

    var property = jsc.forall(checkableGen, function (t) {
      var n = normalize(t);
      return show.checkable(normalize(n)) === show.checkable(n);
    });

    jsc.assert(property);
  });
});