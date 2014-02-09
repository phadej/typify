/* global describe, it */

"use strict";

var typify = require("../lib/typify.js");
var assert = require("assert");

describe("assert()", function () {
  it("throws", function () {
    assert.throws(function () { typify.assert("regexp", 1); });
    typify.assert("regexp", /foo/);
  });

  it("is autocurried", function () {
    var assertNumber = typify.assert("number");
    assert.throws(function () { assertNumber("foo"); });
    assertNumber(1);
  });

  it("takes one or two parameters", function () {
    assert.throws(function () { typify.assert("regexp", 1, 2); });
  });
});
