/* global describe, it */

"use strict";

var fs = require("fs");
var typify = require("../lib/typify.js");
var assert = require("assert");

describe("version", function () {
  it("same in package.json and inside lib", function () {
    var pkg = JSON.parse(fs.readFileSync(__dirname + "/../package.json"));
    assert(pkg.version === typify.version.join("."), "version string should be same");
  });
});
