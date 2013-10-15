/* global typify, describe, it, expect */
(function () {
  "use strict";

  describe("number", function () {
    it("works", function () {
      var chk = typify.check("number");
      expect(chk(0)).toBe(true);
      expect(chk(-0)).toBe(true);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(true);
      expect(chk(0.1)).toBe(true);
      expect(chk(-1000.0001)).toBe(true);
      expect(chk(Infinity)).toBe(true);
      expect(chk(-Infinity)).toBe(true);
      expect(chk(NaN)).toBe(true);
      expect(chk("0")).toBe(false);
    });
  });

  describe("integer", function () {
    it("works", function () {
      var chk = typify.check("integer");
      expect(chk(0)).toBe(true);
      expect(chk(-0)).toBe(true);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(true);
      expect(chk(0.1)).toBe(false);
      expect(chk(-1000.0001)).toBe(false);
      expect(chk(Infinity)).toBe(false);
      expect(chk(-Infinity)).toBe(false);
      expect(chk(NaN)).toBe(false);
      expect(chk("0")).toBe(false);
    });
  });

  describe("nat", function () {
    it("works", function () {
      var chk = typify.check("nat");
      expect(chk(0)).toBe(true);
      expect(chk(-0)).toBe(true);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(false);
      expect(chk(0.1)).toBe(false);
      expect(chk(-1000.0001)).toBe(false);
      expect(chk(Infinity)).toBe(false);
      expect(chk(-Infinity)).toBe(false);
      expect(chk(NaN)).toBe(false);
      expect(chk("0")).toBe(false);
    });
  });

  describe("positive", function () {
    it("works", function () {
      var chk = typify.check("positive");
      expect(chk(0)).toBe(false);
      expect(chk(-0)).toBe(false);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(false);
      expect(chk(0.1)).toBe(true);
      expect(chk(-1000.0001)).toBe(false);
      expect(chk(Infinity)).toBe(true);
      expect(chk(-Infinity)).toBe(false);
      expect(chk(NaN)).toBe(false);
      expect(chk("0")).toBe(false);
    });

    it("integer", function () {
      var chk = typify.check("positive integer");
      expect(chk(0)).toBe(false);
      expect(chk(-0)).toBe(false);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(false);
      expect(chk(0.1)).toBe(false);
      expect(chk(-1000.0001)).toBe(false);
      expect(chk(Infinity)).toBe(false);
      expect(chk(-Infinity)).toBe(false);
      expect(chk(NaN)).toBe(false);
      expect(chk("0")).toBe(false);
    });
  });

  describe("nonnegative", function () {
    it("works", function () {
      var chk = typify.check("nonnegative");
      expect(chk(0)).toBe(true);
      expect(chk(-0)).toBe(true);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(false);
      expect(chk(0.1)).toBe(true);
      expect(chk(-1000.0001)).toBe(false);
      expect(chk(Infinity)).toBe(true);
      expect(chk(-Infinity)).toBe(false);
      expect(chk(NaN)).toBe(false);
      expect(chk("0")).toBe(false);
    });

    it("integer", function () {
      var chk = typify.check("nonnegative integer");
      expect(chk(0)).toBe(true);
      expect(chk(-0)).toBe(true);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(false);
      expect(chk(0.1)).toBe(false);
      expect(chk(-1000.0001)).toBe(false);
      expect(chk(Infinity)).toBe(false);
      expect(chk(-Infinity)).toBe(false);
      expect(chk(NaN)).toBe(false);
      expect(chk("0")).toBe(false);
    });
  });

  describe("finite", function () {
    it("works", function () {
      var chk = typify.check("finite");
      expect(chk(0)).toBe(true);
      expect(chk(-0)).toBe(true);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(true);
      expect(chk(0.1)).toBe(true);
      expect(chk(-1000.0001)).toBe(true);
      expect(chk(Infinity)).toBe(false);
      expect(chk(-Infinity)).toBe(false);
      expect(chk(NaN)).toBe(false);
      expect(chk("0")).toBe(false);
    });

    it("integer", function () {
      var chk = typify.check("finite integer");
      expect(chk(0)).toBe(true);
      expect(chk(-0)).toBe(true);
      expect(chk(1)).toBe(true);
      expect(chk(-1)).toBe(true);
      expect(chk(0.1)).toBe(false);
      expect(chk(-1000.0001)).toBe(false);
      expect(chk(Infinity)).toBe(false);
      expect(chk(-Infinity)).toBe(false);
      expect(chk(NaN)).toBe(false);
      expect(chk("0")).toBe(false);
    });
  });
}());
