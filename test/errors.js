/* global describe, it */

"use strict";

var typify = require("../lib/typify.js");
var assert = require("assert");

describe("error cases", function () {
  it("throws if errorneous type is given", function () {
    assert.throws(function () {
      typify.check("#foo", 1);
    });

    assert.throws(function () {
      typify.check("foo??", 1);
    });
  });
});