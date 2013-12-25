/* global describe, it, beforeEach */

"use strict";

var typify = require("../lib/typify.js");
var assert = require("assert");

describe("records - record()", function () {
  var typ;
  var isPerson;

  beforeEach(function () {
    typ = typify.create();
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

describe("records - anonymous records", function () {
  var typ;
  var isPerson;

  beforeEach(function () {
    typ = typify.create();
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

describe("recursive records", function () {
  var typ;

  beforeEach(function () {
    typ = typify.create();
  });

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
      },
    };

    assert(typ.check("bst", tree));
  });
});
