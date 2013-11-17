/* global describe, it */
(function () {
  "use strict";

  var typify = require("../lib/typify.js");
  var assert = require("assert");

  describe("number", function () {
    it("works", function () {
      var chk = typify.check("number");
      assert(chk(0) === true);
      assert(chk(-0) === true);
      assert(chk(1) === true);
      assert(chk(-1) === true);
      assert(chk(0.1) === true);
      assert(chk(-1000.0001) === true);
      assert(chk(Infinity) === true);
      assert(chk(-Infinity) === true);
      assert(chk(NaN) === true);
      assert(chk("0") === false);
    });
  });

  describe("integer", function () {
    it("works", function () {
      var chk = typify.check("integer");
      assert(chk(0) === true);
      assert(chk(-0) === true);
      assert(chk(1) === true);
      assert(chk(-1) === true);
      assert(chk(0.1) === false);
      assert(chk(-1000.0001) === false);
      assert(chk(Infinity) === false);
      assert(chk(-Infinity) === false);
      assert(chk(NaN) === false);
      assert(chk("0") === false);
    });
  });

  describe("nat", function () {
    it("works", function () {
      var chk = typify.check("nat");
      assert(chk(0) === true);
      assert(chk(-0) === true);
      assert(chk(1) === true);
      assert(chk(-1) === false);
      assert(chk(0.1) === false);
      assert(chk(-1000.0001) === false);
      assert(chk(Infinity) === false);
      assert(chk(-Infinity) === false);
      assert(chk(NaN) === false);
      assert(chk("0") === false);
    });
  });

  describe("positive", function () {
    it("works", function () {
      var chk = typify.check("positive");
      assert(chk(0) === false);
      assert(chk(-0) === false);
      assert(chk(1) === true);
      assert(chk(-1) === false);
      assert(chk(0.1) === true);
      assert(chk(-1000.0001) === false);
      assert(chk(Infinity) === true);
      assert(chk(-Infinity) === false);
      assert(chk(NaN) === false);
      assert(chk("0") === false);
    });

    it("integer", function () {
      var chk = typify.check("positive integer");
      assert(chk(0) === false);
      assert(chk(-0) === false);
      assert(chk(1) === true);
      assert(chk(-1) === false);
      assert(chk(0.1) === false);
      assert(chk(-1000.0001) === false);
      assert(chk(Infinity) === false);
      assert(chk(-Infinity) === false);
      assert(chk(NaN) === false);
      assert(chk("0") === false);
    });
  });

  describe("nonnegative", function () {
    it("works", function () {
      var chk = typify.check("nonnegative");
      assert(chk(0) === true);
      assert(chk(-0) === true);
      assert(chk(1) === true);
      assert(chk(-1) === false);
      assert(chk(0.1) === true);
      assert(chk(-1000.0001) === false);
      assert(chk(Infinity) === true);
      assert(chk(-Infinity) === false);
      assert(chk(NaN) === false);
      assert(chk("0") === false);
    });

    it("integer", function () {
      var chk = typify.check("nonnegative integer");
      assert(chk(0) === true);
      assert(chk(-0) === true);
      assert(chk(1) === true);
      assert(chk(-1) === false);
      assert(chk(0.1) === false);
      assert(chk(-1000.0001) === false);
      assert(chk(Infinity) === false);
      assert(chk(-Infinity) === false);
      assert(chk(NaN) === false);
      assert(chk("0") === false);
    });
  });

  describe("finite", function () {
    it("works", function () {
      var chk = typify.check("finite");
      assert(chk(0) === true);
      assert(chk(-0) === true);
      assert(chk(1) === true);
      assert(chk(-1) === true);
      assert(chk(0.1) === true);
      assert(chk(-1000.0001) === true);
      assert(chk(Infinity) === false);
      assert(chk(-Infinity) === false);
      assert(chk(NaN) === false);
      assert(chk("0") === false);
    });

    it("integer", function () {
      var chk = typify.check("finite integer");
      assert(chk(0) === true);
      assert(chk(-0) === true);
      assert(chk(1) === true);
      assert(chk(-1) === true);
      assert(chk(0.1) === false);
      assert(chk(-1000.0001) === false);
      assert(chk(Infinity) === false);
      assert(chk(-Infinity) === false);
      assert(chk(NaN) === false);
      assert(chk("0") === false);
    });
  });
}());
