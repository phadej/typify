"use strict";

function parensS(guard, str) {
  return guard ? "(" + str + ")" : str;
}

function showCheckableTypePrecedence(precedence, type) {
  if (type.type === "any") {
    return "*";
  } else if (type.type === "literal") {
    return "" + type.value;
  } else if (type.type === "var") {
    return type.name;
  } else if (type.type === "alt") {
    return parensS(precedence > 0,
      type.options.map(showCheckableTypePrecedence.bind(undefined, 0)).join("|"));
  } else if (type.type === "and") {
    return parensS(precedence > 1,
      type.options.map(showCheckableTypePrecedence.bind(undefined, 1)).join("&"));
  } else if (type.type === "poly") {
    return parensS(precedence > 2,
      type.name + " " + type.args.map(showCheckableTypePrecedence.bind(undefined, 3)).join(" "));
  } else /* if (type.type === "opt") */ {
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