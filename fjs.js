
Array.prototype.filter = function(cb, thisArg) {
  thisArg = thisArg || this;
  var ret = [];
  this.forEach(function(element, i) {
    if (cb.apply(thisArg, [element, i])) {
      ret.push(element);
    }
  });
  return ret;
};

Array.prototype.random = function(nelm) {
  nelm = nelm || 1;
  if (nelm <= 0) {
    nelm = 1;
  }
  if (nelm === 1) {
    return this[Math.floor(Math.random() * this.length)];
  }
  var ret = [], i;
  for (i = 0; i < nelm; i++) {
    ret.push(this[Math.floor(Math.random() * this.length)]);
  }
  return ret;
};

Object.prototype.flatten = function() {
  var that = this;
  return Object.getOwnPropertyNames(this).map(function(name) {
    return that[name];
  });
};

Object.prototype.cascade = function(cb) {
  cb.apply(this);
  return this;
};

// TODO: object map, filter

