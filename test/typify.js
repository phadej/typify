/* global describe, it, beforeEach */
(function () {
  "use strict";

  var typify = require("../lib/typify.js");
  var assert = require("assert");

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
        assert.deepEqual(f.safeapply(params), ret);
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

    var choose = typify("choose :: boolean -> number? -> number? -> number", function choose(test, t, f) {
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

      typ1.type("tru", function () { return true; });
      typ2.type("t", function () { return true; });

      assert(typ1.check("tru", 1));
      assert(typ2.check("t", 1));

      assert.throws(function () {
        typ1.check("t", 1);
      });

      assert.throws(function () {
        typ2.check("tru", 1);
      });

      assert.throws(function () {
        typify.check("t", 1);
      });

      assert.throws(function () {
        typify.check("tru", 1);
      });
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

      assert(typify.check("duck", platypus));
      assert(typify.check("mammal", platypus));
      assert(typify.check("mammal&duck", platypus));

      assert(!typify.check("number&string", 1));
    });
  });

  describe("aliases - alias()", function () {
    var typ;

    beforeEach(function () {
      typ = typify.create();
    });

    it("could be use to reduce repetition", function () {
      typ.alias("numstr", "number|string");

      assert(typ.check("numstr", 1));
      assert(typ.check("numstr", "foo"));
      assert(!typ.check("numstr", true));
    });

    it("can be recursive", function () {
      typ.alias("rarray", "array rarray");

      assert(typ.check("rarray", []));
      assert(!typ.check("rarray", 1));
      assert(typ.check("rarray", [[]]));
      assert(!typ.check("rarray", [[1]]));
      assert(typ.check("rarray", [[], [], [[[[[[[[]]]]]], []]]]));
    });
  });

  describe("mutual recursive types - mutual()", function () {
    var typ;

    beforeEach(function () {
      typ = typify.create();
    });

    it("can be recursive", function () {
      typ.mutual({
        "foo": "array bar",
        "bar": "array foo",
      });

      assert(typ.check("foo", []));
      assert(!typ.check("foo", 1));
      assert(typ.check("foo", [[]]));
      assert(!typ.check("foo", [[1]]));
      assert(typ.check("foo", [[], [], [[[[[[[[]]]]]], []]]]));

      assert(typ.check("bar", []));
      assert(!typ.check("bar", 1));
      assert(typ.check("bar", [[]]));
      assert(!typ.check("bar", [[1]]));
      assert(typ.check("bar", [[], [], [[[[[[[[]]]]]], []]]]));
    });
  });

  describe("(kind of) abstract data types", function () {
    var typ;

    beforeEach(function () {
      typ = typify.create();
    });

    it("work", function () {
      typ.adt("option", {
        "none": "{ type: 'none' }",
        "some": "{ type: 'some', value: * }",
      });

      var someValue = { type: "some", value: 1 };
      var noneValue = { type: "none" };
      var otherValue = 1;

      assert(typ.check("option", someValue));
      assert(typ.check("some", someValue));
      assert(!typ.check("none", someValue));
      assert(!typ.check("number", someValue));

      assert(typ.check("option", noneValue));
      assert(!typ.check("some", noneValue));
      assert(typ.check("none", noneValue));
      assert(!typ.check("number", noneValue));

      assert(!typ.check("option", otherValue));
      assert(!typ.check("some", otherValue));
      assert(!typ.check("none", otherValue));
      assert(typ.check("number", otherValue));
    });

    it("constructor cannot has the same name", function () {
      assert.throws(function () {
        typ.adt("foo", { foo: "number "});
      });
    });
  });

  describe("instanceof types - instance()", function () {
    var typ;

    beforeEach(function () {
      typ = typify.create();
    });

    it("work", function () {
      function Foo() {}
      function Bar() {}

      typ.instance("Foo", Foo);
      typ.instance("Bar", Bar);

      assert(typ.check("Foo", new Foo()));
      assert(!typ.check("Foo", new Bar()));

      assert(!typ.check("Bar", new Foo()));
      assert(typ.check("Bar", new Bar()));
    });
  });

  describe("function types - typify()", function () {
    describe("actions", function () {
      it("are functions without parameters", function () {
        var r = typify("r :: -> number", function () {
          return 4;
        });

        r();
      });
    });

    describe("context", function () {
      it("polytypes don't need braces", function () {
        var f = typify("a : array * => a -> a", id);
        assert.deepEqual(f(["foo"]), ["foo"]);
      });

      it("optional types don't need braces", function () {
        var f = typify("a : number? => a -> a", id);
        assert(f(undefined) === undefined);
      });

      it("alternative types need braces", function () {
        var f = typify("a : number|string => a -> a", id);
        assert(f(1) === 1);
        assert(f("foo") === "foo");

        var g = typify("a : (number|string) => a -> a", function() { return "const"; });
        assert(g(1) === "const");
        assert(g("foo") === "const");

        var h = typify("a : number|string => a -> a", function() { return "const"; });
        assert.throws(function () {
          return h(1);
        });
      });

      it("context variable may be polytype", function () {
        var f = typify("a : map | array, b : number | string => a b -> a b", id);
        assert.deepEqual(f([1, 2, 3]), [1, 2, 3]);
        assert.deepEqual(f(["foo", "bar"]), ["foo", "bar"]);
        assert.deepEqual(f({ "foo": 1, "bar": 2 }), { "foo": 1, "bar": 2 });
        assert.deepEqual(f({ "foo": "bar" }), { "foo": "bar" });
        assert.throws(function() { f([true]); });
        assert.throws(function() { f({ "foo": true }); });
        assert.throws(function() { f("foo"); });
      });
    });

    describe("rest parameters", function () {
      it("accepts any parameters", function () {
        var f = typify("... -> number", function () {
          return arguments.length;
        });

        var arr = [];
        for (var i = 0; i < 20; i++) {
          assert(f.apply(undefined, arr) === i);
          arr.push(i);
        }
      });

      it("accepts parameters of specified type", function () {
        var f = typify("number... -> number", function () {
          return arguments.length;
        });

        var arr = [];
        for (var i = 0; i < 20; i++) {
          assert(f.apply(undefined, arr) === i);
          arr.push(i);
        }
      });

      it("accepts context variable as rest type", function () {
        var f = typify("a : number|string => a... -> number", function () {
          return arguments.length;
        });

        var numarr = [];
        for (var i = 0; i < 20; i++) {
          assert(f.apply(undefined, numarr) === i);
          numarr.push(i);
        }

        var strarr = [];
        for (var j = 0; j < 20; j++) {
          assert(f.apply(undefined, strarr) === j);
          strarr.push(""+j);
        }
      });
    });
  });
}());
