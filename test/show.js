/* global describe, it */

"use strict";

var assert = require("assert");
var parse = require("../lib/checkableParser.js").parse;
var show = require("../lib/show.js");
var jsc = require("jsverify");
var random = jsc._.random;
var cons = require("../lib/checkableConstructors.js");

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

function arbitraryCheckable(size) {
  var idents = [ "foo", "bar", "baz", "quux", "true", "false", "null" ];
  function randomIdent() {
    return idents[random(0, idents.length - 1)];
  }
  var type = random(0, 8);
  if (size === 0) {
    switch (type) {
      case 0: return cons.any;
      case 1: return cons.number(random(0, 10));
      case 2: return cons.string(randomIdent());
      default: return cons.variable(randomIdent());
    }
  } else {
    var arr = arbitraryArray(1, arbitraryCheckable.bind(undefined, size - 1));
    switch (type) {
      case 0: return cons.any;
      case 1: return cons.number(random(0, 10));
      case 2: return cons.string(randomIdent());
      case 3: return cons.variable(randomIdent());
      case 4: return cons.alt(arr);
      case 5: return cons.and(arr);
      case 6: return cons.poly(randomIdent(), arr);
      case 7: return cons.opt(arbitraryCheckable(size - 1));
      case 8:
        var fields = {};
        var rsize = random(0, 2);
        for (var i = 0; i < rsize; i++) {
          while (true) {
            var k = randomIdent();
            if (fields.k === undefined) {
              fields[k] = arbitraryCheckable(size - 1);
              break;
            }
          }
        }
        return cons.record(fields);
    }
  }
}

var checkableGen = {
  arbitrary: arbitraryCheckable,
  shrink: function () { return []; },
  show: JSON.stringify,
};

describe("show + parse", function () {
  it("show . parse . show = show", function () {
    function normalize(t) {
      return parse(show.checkable(t));
    }

    var property = jsc.forall(checkableGen, function (t) {
      var n = normalize(t);
      return show.checkable(t) === show.checkable(n);
    });

    jsc.assert(property);
  });
});