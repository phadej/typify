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