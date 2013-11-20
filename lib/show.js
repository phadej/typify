"use strict";

function parensS(guard, str) {
  return guard ? "(" + str + ")" : str;
}

// Forward declaration
var showCheckableTypePrecedence;

function showLiteral(type) {
  if (typeof type.value === "string") {
    return "'" + type.value + "'";
  } else {
    return "" + type.value;
  }
}

function showRecord(type) {
    var pairs = [];
    for (var t in type.fields) {
      pairs.push(t + ": " + showCheckableTypePrecedence(0, type.fields[t]));
    }
    return "{" + pairs.join(", ") + "}";
}

function showCheckableTypePrecedence(precedence, type) {
  switch (type.type) {
    case "any": return "*";
    case "literal": return showLiteral(type);
    case "var": return type.name;
    case "record":
      return showRecord(type);
    case "alt":
      return parensS(precedence > 0,
        type.options.map(showCheckableTypePrecedence.bind(undefined, 0)).join("|"));
    case "and":
      return parensS(precedence > 1,
        type.options.map(showCheckableTypePrecedence.bind(undefined, 1)).join("&"));
    case "poly":
      return parensS(precedence > 2,
        type.name + " " + type.args.map(showCheckableTypePrecedence.bind(undefined, 3)).join(" "));
    case "opt":
      return parensS(precedence > 3,
        showCheckableTypePrecedence(3, type.term) + "?");
  }
}

function showCheckableType(type) {
  return showCheckableTypePrecedence(0, type);
}

function showContext(context) {
  var res = "";
  for (var name in context) {
    res += name + " : " + context[name].map(showCheckableTypePrecedence.bind(undefined, 1)).join(" | ");
  }
  return res;
}


module.exports = {
  checkable: showCheckableType,
  context: showContext,
};