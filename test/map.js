/* global describe, it */

"use strict";

var typify = require("../lib/typify.js");
var assert = require("assert");

describe("map", function () {
  it("matches objects", function () {
    assert(typify.check("map", {}));
    assert(!typify.check("map", 1));
  });

  it("could take type parameter", function () {
    var chk = typify.check("map nat");
    assert(chk({}));
    assert(chk({ a: 1, b: 2 }));
    assert(!chk({ a: 1, b: -1 }));
  });

  it("skips non own properties", function () {
    function C() {}
    C.prototype.a = "foo";
    var x = new C();
    x.b = 1;

    assert(typify.check("map nat", x));
  });
});
