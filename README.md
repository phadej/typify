# typify

> Runtime type-checking.

[![Build Status](https://secure.travis-ci.org/phadej/typify.png?branch=master)](http://travis-ci.org/phadej/typify)
[![NPM version](https://badge.fury.io/js/typify.png)](http://badge.fury.io/js/typify)
[![Dependency Status](https://gemnasium.com/phadej/typify.png)](https://gemnasium.com/phadej/typify)
[![Code Climate](https://codeclimate.com/github/phadej/typify.png)](https://codeclimate.com/github/phadej/typify)

## Getting Started

Install the module with: `npm install typify`

## Synopsis

```javascript
// Browser
// <script src="dist/typify.standalone.js" type="text/javascript"></script>

// Node
var typify = require("typify");

/*
 * `sum` function takes either two numbers or two strings as a parameter,
 * and returns a number or a string respectively.
 */
var add = typify("sum :: a : number|string => a -> a -> a", function (a, b) {
    return a + b;
});

/*
 * `toArray` function takes either an array of numbers or a single number,
 * and returns an array of numbers.
 *
 * We could write a more general, polymorphic function with type signature
 * `toArray :: a : *, (array a)|a -> array a`, where `*` means _any type_.
 *
 * Unfortunately any type `*` is seriously any. 
 * Types as *typify* understands them, are more like Java's interfaces or Haskell's typeclasses.
 * Of course, we can iterate through them all, but we cannot deduce the most principal type (because it doesn't exist).
 * So eg. function signature `id :: a : *, a -> a` behaves similarly to `id :: * -> *`, which isn't strict enough.
 */
var toNumberArray = typify("toNumberArray :: (array number)|number -> array number", function (a) {
    return Array.isArray(a) ? a : [a];
});

/*
 * `myParseInt` takes a string and an optional number (radix) and returns a number.
 */
var myParseInt = typify("myParseInt :: string -> number? -> number", function (n, radix) {
    return parseInt(n, radix || 10)
});

/*
 * `foo` takes at least one number parameter and returns a number.
 */
var foo = typify("foo :: number -> number.. -> number", function (a) {
    return a + arguments.length;
});
```

## Documentation

### API

- `typify(functionSpec, fun)` - decorate function with run-time type check
- `typify.create()` - create new typify environment
- `typify.type(typename, checkFun)` - add new type with user-supplied existence check
- `typify.record(typename, recordspec)` - add new record type
- `typify.alias(typename, typespec)` - give name to the compound type
- `typify.check(typename, value) -> bool` - check membership of value in the type. `check` is [autoCurried](http://fitzgen.github.io/wu.js/#wu-autocurry)

### Checkable type

*Checkable* means, that given an object you can check whether an object is or isn't of the particular type.
For example `number` is checkable type, given any object you can tell if it's a number.

```javascript
typify.check('number', 1); // => true
typify.check('number', 'foobar'); // => false
```

There are few predefined checkable types:

- `number`
- `integer`
- `nat`: non-negative integer
- `positive` _x_
- `nonnegative` _x_
- `finite` _x_
- `string`
- `boolean`
- `null`
- `date`
- `regexp`
- `function`
- `array` _a_
- `map` _a_

#### Formal syntax of checkable type declaration:

- *checkable type* σ ::= σ_or
    - σ_or ::= σ_and (`|` σ_and)*
    - σ_and ::= σ_poly (`&` σ_poly)*
    - σ_poly ::= *typename* σ_opt+ | σ_opt
    - σ_opt = σ_term | σ_term `?`
    - σ_term ::= `*` | α | *literal* | *typename* | `(` σ_alt `)`
- *type variable* α ::= *identifier*
- *literal* ::= /\d+/ | true | false | null
- *identifier*, *typename* ::= /[a-zA-Z_][a-zA-Z0-9_]*/

### Function type

Function types are difficult to check. Given a function object, only you can tell, it's a function object.
To be more precise, you can decorate your function with *function type* signature to verify parameters' and result's types, but the check will occur only when function is executed ie. run-time.

```javascript
var add = typify("add :: number -> number -> number", function (a, b) {
    return a + b;
});

console.log(add(1, 2)); // ok
console.log(add("foo", "bar")); // throws TypeError
```

#### Formal syntax of function type declaration:

- *function type* λ ::= ν μ | ν Γ (σ `->`)* ρ σ
- *action* μ ::= `->` τ
- *context* Γ ::= α `:` Σ (`,` α `:` Σ)* `=>` | ε
- *typeset* Σ ::= σ_poly (`|` σ_poly)*
- *rest parameters* ρ ::= σ `...` `->` | `...` `->` | ε
- *function name* ν ::= *identifier* `::` | ε

### New types

New types can be added with `typify.type` method:

```javascript
typify.type("char", function(n) {
    return typeof n === "string" && n.length === 1;
});
```

You can give names to (recursive) compound types with `typify.alias`:
```javascript
typify.alias("numstr", "number|string"); // numbers or strings
typify.alias("rarray", "array rarray"); // arrays of itself, eg [[[[[[]]]]]
```

Also you can define *record* types with `typify.record`:

```javascript
typify.record("person", {
    name: "string",
    age: "number",
});
```

Record types may be recursive:

```javascript
typ.record("bst", {
    left: "bst?",
    right: "bst?",
});
```

### Hygiene usage

If you don't want to use global type database, you can create your own instance of *typify*:

```js
// In browser
var myTypify = typify.create();

// or alternatively, using "let-binding":
(function (typify) {
    // use typify as it would be global
}(typify.create()));

// In node
var typify = require("typify").create();
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

- You can use `grunt jasmine-build` to generate `_SpecRunner.html` to run tests in your browser of choice.

## Release History

- 0.2.0
    - Recursive record types
    - Recursive aliases
    - Intersection types
    - Hygiene type environments

- 0.1.1
    - Record type
    - Fixed typos in README.md

- 0.1.0 Initial release

## License
Copyright (c) 2013 Oleg Grenrus. Licensed under the BSD3 license.

## Related work

### Javascript

- [rho-contracts](https://github.com/sefaira/rho-contracts.js)
- [ducktype](https://github.com/josdejong/ducktype)
- [type-check](https://github.com/gkz/type-check)

### Others

- [Racket - Contracts for higher-order functions](http://dl.acm.org/citation.cfm?id=581484)
- [Typed Clojure](https://github.com/clojure/core.typed)
