/* global describe, it, beforeEach */

"use strict";

var typify = require("../lib/typify.js");
var assert = require("assert");

describe("records", function () {
  var typ;
  beforeEach(function () {
    typ = typify.create();
  });

  describe("basic functionality", function () {
    var isPerson;

    beforeEach(function () {
      typ.record("person", {
        name: "string",
        age: "number",
      });
      isPerson = typ.check("person");
    });

    it("adds type definition which is falsy for non-objects", function () {
      assert(!isPerson(undefined));
      assert(!isPerson(null));
      assert(!isPerson(true));
      assert(!isPerson(false));
      assert(!isPerson(0));
      assert(!isPerson(1));
      assert(!isPerson(""));
      assert(!isPerson("foobar"));
    });

    it("is falsy for objects with missing properties", function () {
      assert(!isPerson({}));
      assert(!isPerson({ age: 10 }));
      assert(!isPerson({ name: "foo" }));
    });

    it("is truthy for objects with all properties", function () {
      assert(isPerson({ age: 10, name: "foo" }));
    });

    it("is truthy for objects with extra properties", function () {
      assert(isPerson({ age: 10, name: "foo", height: 175 }));
    });
  });

  describe("closed", function () {
    var isPerson;

    beforeEach(function () {
      typ.record("person", {
        name: "string",
        age: "number",
      }, true);
      isPerson = typ.check("person");
    });

    it("is falsy for objects with missing properties", function () {
      assert(!isPerson({}));
      assert(!isPerson({ age: 10 }));
      assert(!isPerson({ name: "foo" }));
    });

    it("is truthy for objects with all properties", function () {
      assert(isPerson({ age: 10, name: "foo" }));
    });

    it("is falsy for objects with extra properties", function () {
      assert(!isPerson({ age: 10, name: "foo", height: 175 }));
    });
  });

  describe("anonymous records", function () {
    var isPerson;

    beforeEach(function () {
      typ.alias("person", "{name: string, age: number}");
      isPerson = typ.check("person");
    });

    it("adds type definition which is falsy for non-objects", function () {
      assert(!isPerson(undefined));
      assert(!isPerson(null));
      assert(!isPerson(true));
      assert(!isPerson(false));
      assert(!isPerson(0));
      assert(!isPerson(1));
      assert(!isPerson(""));
      assert(!isPerson("foobar"));
    });

    it("is falsy for objects with missing properties", function () {
      assert(!isPerson({}));
      assert(!isPerson({ age: 10 }));
      assert(!isPerson({ name: "foo" }));
    });

    it("is truthy for objects with all properties", function () {
      assert(isPerson({ age: 10, name: "foo" }));
    });

    it("is truthy for objects with extra properties", function () {
      assert(isPerson({ age: 10, name: "foo", height: 175 }));
    });
  });

  describe("recursive", function () {
    it("you can have", function () {
      typ.record("bst", {
        left: "bst?",
        right: "bst?",
      });

      var tree = {
        left: {
          left: { value: 1 },
          right: { value: 2 },
        },
        value: 3,
        right: {
          value: 4,
          right: {
            value: 5,
          }
        },
      };

      assert(typ.check("bst", tree));
    });
  });

  describe("special cases", function () {
    it("doesn't check prototype properties", function () {
      function P () {}
      P.prototype.name = "string";
      P.prototype.age = "number";
      typ.record("person", new P());

      assert(typ.check("person", {}));
    });
  });
});
