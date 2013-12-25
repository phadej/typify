/* global describe, it */

"use strict";

var typify = require("../lib/typify.js");
var assert = require("assert");

describe("regexp", function () {
  it("are RegExp objects", function () {
    assert(typify.check("regexp", /foo/));
    assert(typify.check("regexp", new RegExp("foo")));
    assert(!typify.check("regexp", 1));
  });
});

describe("date", function () {
  it("are Date objects", function () {
    assert(typify.check("date", new Date()));
    assert(!typify.check("date", 1));
  });
});

describe("null", function () {
  it("matches `null`", function () {
    assert(typify.check("null", null));
    assert(!typify.check("null", undefined));
    assert(!typify.check("null", {}));
  });
});

describe("literal numbers", function () {
  it("matches number exactly", function () {
    assert(typify.check("1", 1));
    assert(!typify.check("1", "1"));
    assert(!typify.check("1", 2));
    assert(typify.check("100", 100));
  });
});

describe("literal strings", function () {
  it("matches string exactly", function () {
    assert(typify.check("'foo'", "foo"));
    assert(typify.check("\"foo\"", "foo"));
    assert(!typify.check("'foo'", 2));
    assert(typify.check("'bar'", "bar"));
  });
});

describe("literal atoms", function () {
  it("matches true, false, null", function () {
    assert(typify.check("null", null));
    assert(!typify.check("true", null));
    assert(!typify.check("false", null));
    assert(!typify.check("number", null));

    assert(!typify.check("null", true));
    assert(typify.check("true", true));
    assert(!typify.check("false", true));
    assert(!typify.check("number", true));

    assert(!typify.check("null", false));
    assert(!typify.check("true", false));
    assert(typify.check("false", false));
    assert(!typify.check("number", false));

    assert(!typify.check("null", 1));
    assert(!typify.check("true", 1));
    assert(!typify.check("false", 1));
    assert(typify.check("number", 1));
  });
});

describe("tuple", function () {
  it("is fixed size array", function () {
    assert(typify.check("tuple integer string", [0, "foo"]));
    assert(!typify.check("tuple integer string", [0, 0]));
  });
});
