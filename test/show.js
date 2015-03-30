/* global describe, it */

"use strict";

var assert = require("assert");
var parse = require("../lib/checkableParser.js").parse;
var cons = require("../lib/checkableConstructors.js");
var show = require("../lib/show.js");
var jsc = require("jsverify");

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
  size = 2 + jsc.random(0, size);
  var arr = [];
  for (var i = 0; i < size; i++) {
    arr.push(arbitrary());
  }
  return arr;
}

var idents = [ "foo", "bar", "baz", "quux", "true", "false", "null" ];
var identArb = jsc.elements(idents);

var checkableGenerator = jsc.generator.recursive(
  jsc.generator.oneof([
    jsc.generator.constant(cons.any),
    jsc.nat(10).generator.map(cons.number),
    identArb.generator.map(cons.string),
    identArb.generator.map(cons.variable),
  ]),
  function (gen) {
    return jsc.generator.oneof([
      jsc.generator.nearray(gen).map(cons.alt),
      jsc.generator.nearray(gen).map(cons.and),
      jsc.generator.combine(identArb.generator, jsc.generator.nearray(gen), cons.poly),
      gen.map(cons.opt),
      jsc.generator.array(jsc.generator.pair(identArb.generator, gen)).map(function (spec) {
        var fields = {};
        spec.forEach(function (pair) {
          fields[pair[0]] = pair[1];
        });
        return cons.record(fields);
      }),
    ]);
  }
);

var checkableArb = jsc.bless({
  generator: checkableGenerator
});

describe("show + parse", function () {
  it("show . parse . show = show", function () {
    function normalize(t) {
      return parse(show.checkable(t));
    }

    var property = jsc.forall(checkableArb, function (t) {
      var n = normalize(t);
      return show.checkable(t) === show.checkable(n);
    });

    jsc.assert(property);
  });
});
