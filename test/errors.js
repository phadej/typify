/* global describe, it, beforeEach */

"use strict";

var typify = require("../lib/typify.js");
var assert = require("assert");

describe("error cases", function () {
  var typ;

  beforeEach(function () {
    typ = typify.create();
  });

  it("throws if errorneous type is given", function () {
    assert.throws(function () {
      typ.check("#foo", 1);
    });

    assert.throws(function () {
      typ.check("foo??", 1);
    });

    assert.throws(function () {
      typ.check("number", 1, 1);
    });
  });

  it("throws if errorneous type if given to function", function () {
    assert.throws(function () {
      typify(1, function () {});
    });

    assert.throws(function () {
      typify("##", function () {});
    });

    assert.throws(function () {
      typify("=>", function () {});
    });
  });

  it("type() throws if wrong parameters", function () {
    assert.throws(function () {
      typ.type(1);
    });

    assert.throws(function () {
      typ.type("foo",  1);
    });

    assert.throws(function () {
      typ.type("foo", function () {});
      typ.type("foo", function () {});
    });
  });

  describe("check()", function () {
    it("throws if unknown type is given", function () {
      assert.throws(function () {
        typ.check("list number", [1, 1]);
      });
    });
  });
});
