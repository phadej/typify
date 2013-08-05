/* global typify, describe, it, expect, beforeEach */
(function () {
  "use strict";

  // identity
  function id(x) { return x; }

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

  describe("separate instances - create()", function () {
    it("don't share types", function () {
      var typ1 = typify.create();
      var typ2 = typify.create();

      typ1.type("true", function () { return true; });
      typ2.type("t", function () { return true; });

      expect(typ1.check("true", 1)).toBeTruthy();
      expect(typ2.check("t", 1)).toBeTruthy();

      expect(function () {
        typ1.check("t", 1);
      }).toThrow();

      expect(function () {
        typ2.check("true", 1);
      }).toThrow();

      expect(function () {
        typify.check("t", 1);
      }).toThrow();

      expect(function () {
        typify.check("true", 1);
      }).toThrow();
    });
  });

  describe("intersection types", function () {
    typify.record("duck", {
      quack: "function",
    });

    typify.record("mammal", {
      milk: "function",
    });

    it("are useful when ducktyping", function () {
      var platypus = {
        quack: id,
        milk: id,
      };

      expect(typify.check("duck", platypus)).toBeTruthy();
      expect(typify.check("mammal", platypus)).toBeTruthy();
      expect(typify.check("mammal&duck", platypus)).toBeTruthy();

      expect(typify.check("number&string", 1)).toBeFalsy();
    });
  });

  describe("records - record()", function () {
    var typ;

    beforeEach(function () {
      typ = typify.create();
      typ.record("person", {
        name: "string",
        age: "number",
      });
    });

    it("adds type definition which is falsy for non-objects", function () {
      expect(typ.check("person", undefined)).toBeFalsy();
      expect(typ.check("person", null)).toBeFalsy();
      expect(typ.check("person", true)).toBeFalsy();
      expect(typ.check("person", false)).toBeFalsy();
      expect(typ.check("person", 0)).toBeFalsy();
      expect(typ.check("person", 1)).toBeFalsy();
      expect(typ.check("person", "")).toBeFalsy();
      expect(typ.check("person", "foobar")).toBeFalsy();
    });

    it("is falsy for objects with missing properties", function () {
      expect(typ.check("person", {})).toBeFalsy();
      expect(typ.check("person", { age: 10 })).toBeFalsy();
      expect(typ.check("person", { name: "foo" })).toBeFalsy();
    });

    it("is truthy for objects with all properties", function () {
      expect(typ.check("person", { age: 10, name: "foo" })).toBeTruthy();
    });

    it("is truthy for objects with extra properties", function () {
      expect(typ.check("person", { age: 10, name: "foo", height: 175 })).toBeTruthy();
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

      expect(typ.check("bst", tree)).toBeTruthy();
    });
  });

  describe("function types - typify()", function () {
    describe("context", function () {
      it("polytypes don't need braces", function () {
        var f = typify("a : array * => a -> a", id);
        expect(f(["foo"])).toEqual(["foo"]);
      });

      it("optional types don't need braces", function () {
        var f = typify("a : number? => a -> a", id);
        expect(f(undefined)).toEqual(undefined);
      });

      it("alternative types need braces", function () {
        var f = typify("a : number|string => a -> a", id);
        expect(f(1)).toEqual(1);
        expect(f("foo")).toEqual("foo");

        var g = typify("a : (number|string) => a -> a", function() { return "const"; });
        expect(g(1)).toBe("const");
        expect(g("foo")).toBe("const");

        var h = typify("a : number|string => a -> a", function() { return "const"; });
        expect(function () { return h(1); }).toThrow();
      });
    });

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
