/* global typify, describe, it, expect */
(function () {
  "use strict";

  // safe executor
  Function.prototype.safeapply = function safe(args) {
    try {
      return this.apply(this, args);
    } catch (e) {
      // console.error(e.toString());
      return "_|_";
    }
  };

  function itreturns(fname, f, specs) {
    specs.forEach(function (v) {
      var params = v.slice(0, -1);
      var ret = v.slice(-1)[0];

      it(fname + "(" + params.map(JSON.stringify).join(", ") + ") == " + (ret === "_|_" ? ret : JSON.stringify(ret)), function() {
        expect(f.safeapply(params)).toEqual(ret);
      });
    });
  }

  describe("examples:", function () {
    var factorial = typify("number -> number", function factorial(n) {
      if (n === 0) {
        return 1;
      } else {
        return n * factorial(n-1);
      }
    });

    itreturns("factorial", factorial, [
      [3, 6],
      ["foo", "_|_"],
      [1, 2, "_|_"],
    ]);

    function doubleImpl(v) {
      return v + v;
    }

    var double1 = typify("* -> number", doubleImpl);
    itreturns("double1", double1, [
      [1, 2],
      ["foo", "_|_"],
    ]);

    var double2 = typify("number -> number", doubleImpl);
    itreturns("double2", double2, [
      [1, 2],
      ["foo", "_|_"],
    ]);

    var double3 = typify("number|string -> number|string", doubleImpl);
    itreturns("double3", double3, [
      [1, 2],
      ["foo", "foofoo"],
      [true, "_|_"],
    ]);

    var double4 = typify("a : number|string => a -> a", doubleImpl);
    itreturns("double4", double4, [
      [1, 2],
      ["foo", "foofoo"],
      [true, "_|_"],
    ]);

    var choose = typify("boolean -> number? -> number? -> number", function choose(test, t, f) {
      return test ? (t ? t : 1) : (f ? f : 0);
    });
    itreturns("choose", choose, [
      [true, 2, 1, 2],
      [true, 2, null, "_|_"],
      [true, undefined, 3, 1],
      [true, 2, undefined, 2],
      [true, 2, 2],
      [true, 1],
      ["_|_"],
      [true, 1, 2, 3, "_|_"],
    ]);
  });

  describe("records - record()", function () {
    typify.record("person", {
      name: "string",
      age: "number",
    });

    it("adds type definition which is falsy for non-objects", function () {
      expect(typify.check("person", undefined)).toBeFalsy();
      expect(typify.check("person", null)).toBeFalsy();
      expect(typify.check("person", true)).toBeFalsy();
      expect(typify.check("person", false)).toBeFalsy();
      expect(typify.check("person", 0)).toBeFalsy();
      expect(typify.check("person", 1)).toBeFalsy();
      expect(typify.check("person", "")).toBeFalsy();
      expect(typify.check("person", "foobar")).toBeFalsy();
    });

    it("is falsy for objects with missing properties", function () {
      expect(typify.check("person", {})).toBeFalsy();
      expect(typify.check("person", { age: 10 })).toBeFalsy();
      expect(typify.check("person", { name: "foo" })).toBeFalsy();
    });

    it("is truthy for objects with all properties", function () {
      expect(typify.check("person", { age: 10, name: "foo" })).toBeTruthy();
    });

    it("is truthy for objects with extra properties", function () {
      expect(typify.check("person", { age: 10, name: "foo", height: 175 })).toBeTruthy();
    });
  });

  describe("function types - typify()", function () {

    describe("rest parameters", function () {
      it("accepts any parameters", function () {
        var f = typify("... -> number", function () {
          return arguments.length;
        });

        var arr = [];
        for (var i = 0; i < 20; i++) {
          expect(f.apply(undefined, arr)).toBe(i);
          arr.push(i);
        }
      });

      it("accepts parameters of specified type", function () {
        var f = typify("number... -> number", function () {
          return arguments.length;
        });

        var arr = [];
        for (var i = 0; i < 20; i++) {
          expect(f.apply(undefined, arr)).toBe(i);
          arr.push(i);
        }
      });

      it("accepts context variable as rest type", function () {
        var f = typify("a : number|string => a... -> number", function () {
          return arguments.length;
        });

        var numarr = [];
        for (var i = 0; i < 20; i++) {
          expect(f.apply(undefined, numarr)).toBe(i);
          numarr.push(i);
        }

        var strarr = [];
        for (var j = 0; j < 20; j++) {
          expect(f.apply(undefined, strarr)).toBe(j);
          strarr.push(""+j);
        }
      });
    });
  });
}());
