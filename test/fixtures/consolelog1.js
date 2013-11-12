function multiply ( x, y ) {
  var res = 0;
  for (var i = 0; i < y; i++) {
    res += x;
  }
  return res;
}

console.log(multiply(3, 4));