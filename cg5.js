
var window = window || {};

// GFXRunloop {{{
var GFXRunloop = (function() {
  var runner = {}, _runloop_running = false, _runloopID = -1, sources = [];
  
  runner.SourceTypes = {
    Default: 0,
    OneShot: 1
  };

  runner.addSource = function(source, type) {
    if (runner.looping) {
      runner.addingQueue.push({ source: source, type: type });
      return this;
    }
    source.type = typeof type === "number" ? type : 0;
    sources.push(source);
    this.start();
    return this;
  };
  runner.removeSource = function(source) {
    if (runner.looping) {
      source.queuedToStop = true;
      runner.removalQueue.push(source);
      return this;
    }
    var sourceID;
    if ((sourceID = sources.indexOf(source)) !== -1) {
      sources.splice(sourceID, 1);
      if (sources.length === 0) {
        this.stop();
      }
    }
    return this;
  };
  runner.looping = false;
  runner.removalQueue = [];
  runner.addingQueue = [];
  runner.removeQueuedSources = function() {
    runner.removalQueue.forEach(function(source) {
      runner.removeSource(source);
    });
    while (runner.removalQueue.length > 0) {
      runner.removalQueue.pop();
    }
  };
  runner.addQueuedSources = function() {
    runner.addingQueue.forEach(function(obj) {
      runner.addSource(obj.source, obj.type);
    });
    while (runner.addingQueue.length > 0) {
      runner.addingQueue.pop();
    }
  };
  function runloop() {
    var i;
    runner.looping = true;
    for (i = 0; i < sources.length; i++) {
      var source = sources[i];
      if (!source.queuedToStop) {
        source();
        switch (sources[i].type) {
          case 1:
            runner.removeSource(sources[i]);
            break;
        }
      }
    }
    runner.looping = false;
    runner.addQueuedSources();
    runner.removeQueuedSources();
    if (_runloop_running) {
      _runloopID = window.requestAnimationFrame(runloop);
    }
  }

  runner.start = function() {
    if (_runloop_running) {
      return;
    }
    _runloopID = window.requestAnimationFrame(runloop);
    _runloop_running = true;
  };
  runner.stop = function() {
    if (!_runloop_running) {
      return;
    }
    window.cancelAnimationFrame(_runloopID);
    _runloop_running = false;
    _runloopID = -1;
  };

  return runner;
}());
// }}}

var CG5 = (function() {
  var that = {}, views = [];
 
  // helper functions {{{
  function function_hooks(pre, post) {
    return {
      pre: pre,
      post: post
    };
  }
  function capitalize(word) {
    return word[0].toUpperCase() + word.slice(1);
  }
  function decapitalize(word) {
    return word[0].toLowerCase() + word.slice(1);
  }
  function syntheticProperty(obj, name, getterHooks, setterHooks, defaultValue) { // TODO: 3 typechecking maybe?
    var setterName = "set" + capitalize(name);
    obj["_" + name] = defaultValue;
    obj[name] = function(arg) {
      if (arguments.length >= 1) {
        return this[setterName].apply(this, arguments);
      }
      var retval;
      if (getterHooks && getterHooks.pre && (retval = getterHooks.pre.apply(this, [this["_" + name]])) !== undefined) {
        return retval;
      }
      return this["_" + name];
    };
    obj[setterName] = function(val) {
      var retval;
      if (setterHooks && setterHooks.pre && (retval = setterHooks.pre.apply(this, arguments)) !== undefined) {
        this["_" + name] = retval;
      } else {
        this["_" + name] = val;
      }
      if (setterHooks && setterHooks.post) {
        setterHooks.post.apply(this, [this["_" + name]]);
      }
      return this;
    };
  }
  function dynamicProperty(obj, name, getter, setter) {
    obj[name] = function(args) {
      return getter.apply(this, arguments);
    };
    obj["set" + capitalize(name)] = function(val) {
      setter.apply(this, arguments);
      return this;
    };
  }
  function createGetter(string) {
    var results;
    if ((results = /^set(.*)/.exec(string)) !== null) {
      return decapitalize(results[1]);
    }
    return string;
  }
  function ensure_length(arr, len) {
    var tmp;
    if (Array.isArray(arr)) {
      if (arr.length < len) {
        tmp = arr[arr.length - 1];
        while (arr.length < len) {
          arr.push(tmp);
        }
      } else if (arr.length > len) {
        while (arr.length > len) {
          arr.pop();
        }
      }
    } else {
      tmp = arr;
      arr = [];
      while (arr.length < len) {
        arr.push(tmp);
      }
    }
    return arr;
  }
  // }}}
  
  // Init {{{
  that.initialize = function(element) { // TODO: 2 allow this to be one per canvas!
    this.context = element.getContext("2d");
    this.screen = this.rect(0,0,element.width, element.height);
  };
  // }}}
  
  // CG5Geometry {{{
  that.pointize = function(arr) {
    if (Array.isArray(arr)) {
      switch(arr.length) {
        case 0:
          return this.pointZero;
        case 1:
          return this.point(arr[0], 0);
        default:
          return this.point(arr[0], arr[1]);
      }
    } else {
      return arr;
    }
  };
  that.point = function(x, y) {
    return {
      x: x,
      y: y,
      array: function() {
        return [this.x, this.y];
      }
    };
  };
  that.pointZero = { x: 0, y: 0 };
  that.pointRandom = function(rect) {
    rect = CG5.rectize(rect);
    var x = Math.floor(Math.random() * rect.size.width) + rect.origin.x;
    var y = Math.floor(Math.random() * rect.size.height) + rect.origin.y;
    return this.point(x, y);
  };
  
  that.sizeize = function(arr) {
    if (Array.isArray(arr)) {
      switch(arr.length) {
        case 0:
          return this.sizeZero;
        case 1:
          return this.size(arr[0], 0);
        default:
          return this.size(arr[0], arr[1]);
      }
    } else {
      return arr;
    }
  };
  that.size = function(width, height) {
    return {
      width: width,
      height: height,
      array: function() {
        return [this.width, this.height];
      }
    };
  };
  that.sizeZero = { width: 0, height: 0 };
  that.sizeRandom = function(minSize, maxSize) {
    minSize = this.sizeize(minSize);
    maxSize = this.sizeize(maxSize);
    var width = Math.floor(Math.random() * (maxSize.width - minSize.width)) + minSize.width;
    var height = Math.floor(Math.random() * (maxSize.height - minSize.height)) + minSize.height;
    return this.size(width, height);
  };

  that.rectize = function(arr) {
    if (Array.isArray(arr)) {
      var pnt, s;
      switch(arr) {
        case 0:
          return this.rectZero;
        case 1:
          if (typeof arr[0] === "number") {
            return this.rect(arr[0],0,0,0);
          }
          pnt = this.pointize(arr[0]);
          s = this.sizeZero;
          return this.rect(pnt.x, pnt.y, s.width, s.height);
        case 2:
          if (typeof arr[0] === "number") {
            return this.rect(arr[0], arr[1], 0,0);
          }
          pnt = this.pointize(arr[0]);
          s = this.sizeize(arr[1]);
          return this.rect(pnt.x, pnt.y, s.width, s.height);
        case 3:
          if (typeof arr[0] === "number") {
            return this.rect(arr[0], arr[1], arr[2], 0);
          }
          pnt = this.pointize(arr[0]);
          s = this.sizeize(arr[1]);
          return this.rect(pnt.x, pnt.y, s.width, s.height);
        default:
          return this.rect(arr[0], arr[1], arr[2], arr[3]);
      }
    } else {
      return arr;
    }
  };
  that.rect = function(x, y, width, height) {
    return {
      origin: this.point(x,y),
      size: this.size(width, height),
      array: function() {
        return [this.origin.array(), this.size.array()];
      }
    };
  };
  that.rectInset = function(rect, insets) {
    rect = CG5.rectize(rect);
    insets = CG5.rectize(insets);
    return this.rect(rect.origin.x + insets.origin.x, rect.origin.y + insets.origin.y, rect.size.width - insets.origin.x - insets.size.width, rect.size.height - insets.origin.y - insets.size.height);
  };
  that.rectZero = {
    origin: that.pointZero, size: that.sizeZero
  };
  that.rectRandom = function(minSize, outerRect) {
    minSize = this.sizeize(minSize);
    outerRect = this.rectize(outerRect);
    var origin = this.pointRandom(outerRect);
    var maxSize = this.size(outerRect.size.width - origin.x, outerRect.size.height - origin.y);
    var size = this.sizeRandom(minSize, maxSize);
    return this.rectize(origin, size);
  };

  that.threeVectorize = function(arr) {
    if (Array.isArray(arr)) {
      var pnt;
      switch(arr.length) {
        case 0:
          return this.threeVectorZero;
        case 1:
          if (typeof arr[0] === "number") {
            return this.threeVector(arr[0], 0, 0);
          }
          pnt = this.pointize(arr[0]);
          return this.threeVector(pnt.x, pnt.y, 0);
        case 2:
          if (typeof arr[0] === "number") {
            return this.threeVector(arr[0], arr[1], 0);
          }
          pnt = this.pointize(arr[0]);
          return this.threeVector(pnt.x, pnt.y, arr[1]);
        default:
          return this.threeVector(arr[0], arr[1], arr[2]);
      }
    } else {
      return arr;
    }
  };
  that.threeVector = function(x,y,z) {
    return {
      x: x,
      y: y,
      z: z
    };
  };
  that.threeVectorZero = { x: 0, y: 0, z: 0 };

  that.color = function(r,g,b,a) {
    var that = {};
    that.r = r;
    that.g = g;
    that.b = b;
    that.a = typeof a === "number" ? a : 1;
    dynamicProperty(that, "array", function(arg) {
      if (arguments.length >= 1) {
        return this.setArray.apply(this, arguments);
      }
      return [this.r,this.g,this.b,this.a];
    }, function(arr) {
      switch (arr.length) {
        case 1:
          this.r = arr[0];
          break;
        case 2:
          this.r = arr[0];
          this.g = arr[1];
          break;
        case 3:
          this.r = arr[0];
          this.g = arr[1];
          this.b = arr[2];
          break;
        case 4:
          this.r = arr[0];
          this.g = arr[1];
          this.b = arr[2];
          this.a = arr[3];
          break;
      }
    });
    dynamicProperty(that, "string", function(arg) {
      if (arguments.length >= 1) {
        return this.setString.apply(this, arguments);
      }
      return "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")";
    }, function(color) {
      var results, r, g, b, a;
      if ((results = /#([a-fA-F0-9]{3})$/.exec(color)) !== null) {
        r = parseInt(results[1][0] + results[1][0], 16);
        g = parseInt(results[1][1] + results[1][1], 16);
        b = parseInt(results[1][2] + results[1][2], 16);
        a = 1;
      } else if ((results = /#([a-fA-F0-9]{6})/.exec(color)) !== null) {
        r = parseInt(results[1].substr(0,2), 16);
        g = parseInt(results[1].substr(2,2), 16);
        b = parseInt(results[1].substr(4,2), 16);
        a = 1;
      } else if ((results = /rgb\(\s*(\d+(?:\.\d*)?)\s*,\s*(\d+(?:\.\d*)?)\s*,\s*(\d+(?:\.\d*)?)\s*\)/.exec(color)) !== null) {
        r = parseFloat(results[1]);
        g = parseFloat(results[2]);
        b = parseFloat(results[3]);
        a = 1;
      } else if ((results = /rgba\(\s*(\d+(?:\.\d*)?)\s*,\s*(\d+(?:\.\d*)?)\s*,\s*(\d+(?:\.\d*)?)\s*,\s*(\d+(?:\.\d*)?)\s*\)/.exec(color)) !== null) {
        r = parseFloat(results[1]);
        g = parseFloat(results[2]);
        b = parseFloat(results[3]);
        a = parseFloat(results[4]);
      } 
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
    });
    return that;
  };
  that.colorFromArray = function(colorArray) {
    return this.color(0,0,0,0).setArray(colorArray);
  };
  that.colorFromString = function(string) {
    return this.color(0,0,0,0).setString(string);
  };
  // }}}

  // Gradients {{{
  that.colorStop = function(loc, col) {
    return {
      loc: loc,
      color: col
    };
  };
  that.linearGradient = function(start, finish, stops) {
    return {
      start: CG5.pointize(start),
      finish: CG5.pointize(finish),
      colorStops: (stops || []),
      addColorStop: function(loc, col) {
        this.colorStops.push({
          loc: loc,
          color: col
        });
        return this;
      }
    };
  };
  that.singleColorLinearGradient = function(color, orientation) {
    var start, finish;
    if (typeof orientation === "number") {
      switch(orientation) {
        case 0:
          start = [0.5,0];
          finish = [0.5,1];
          break;
        case 1:
          start = [0,0.5];
          finish = [1,0.5];
          break;
        case 2:
          start = [0.5,1];
          finish = [0.5,0];
          break;
        default:
          start = [1,0.5];
          finish = [0,0.5];
          break;
      }
    } else {
      start = [0.5, 0];
      finish = [0.5, 1];
    }
    return this.linearGradient(start,finish).addColorStop(0, color).addColorStop(1, color.cascade(function() { this.alpha = 0; }));
  };
  that.radialGradient = function(start, finish, stops) {
    return {
      start: CG5.threeVectorize(start),
      finish: CG5.threeVectorize(finish),
      colorStops: (stops || []),
      addColorStop: function(loc, col) {
        this.colorStops.push({
          loc: loc,
          color: col
        });
        return this;
      }
    };
  };
  that.singleColorRadialGradient = function(color) {
    return this.radialGradient([0.5,0.5,0],[0.5,0.5,1]).addColorStop(0, color).addColorStop(1, color.cascade(function() { this.alpha = 0; }));
  };
  // }}}
  
  // Animations {{{
  that._displaySource = function(all) {
    return function() {
      views.forEach(function(view) {
        if (all || view.needsDisplay) {
          view._drawRect(view.rect());
        }
      });
    };
  };

  that.tweens = {};
  that.tweens.quadInOut = function(t, b, c, d) {
    if ((t/=d/2) < 1) {
      return c/2*t*t + b;
    }
    return -c/2 * ((--t)*(t-2) - 1) + b;
  };
  that.tweens.linear = function(t, b, c, d) {
    return c*t/d + b;
  };
  that.tweens.quadIn = function(t, b, c, d) {
    return c * (t/=d) * t + b;
  };
  that.tweens.quadOut = function(t, b, c, d) {
    return -c * (t/=d)*(t-2) + b;
  };
  that.tweens.cubeIn = function(t, b, c, d) {
    return c * Math.pow (t/d, 3) + b;
  };
  that.tweens.cubeOut = function(t, b, c, d) {
    return c * (Math.pow (t/d-1, 3) + 1) + b;
  };
  that.tweens.cubeInOut = function(t, b, c, d) {
    if ((t/=d/2) < 1) {
      return c/2 * Math.pow (t, 3) + b;
    }
    return c/2 * (Math.pow (t-2, 3) + 2) + b;
  };
  that.tweens.quartIn = function(t, b, c, d) {
    return c * Math.pow (t/d, 4) + b;
  };
  that.tweens.quartOut = function(t, b, c, d) {
    return -c * (Math.pow (t/d-1, 4) - 1) + b;
  };
  that.tweens.quartInOut = function(t, b, c, d) {
    if ((t/=d/2) < 1) {
      return c/2 * Math.pow (t, 4) + b;
    }
    return -c/2 * (Math.pow (t-2, 4) - 2) + b;
  };
  that.tweens.quintIn = function(t, b, c, d) {
    return c * Math.pow (t/d, 5) + b;
  };
  that.tweens.quintOut = function(t, b, c, d) {
    return c * (Math.pow (t/d-1, 5) + 1) + b;
  };
  that.tweens.quintInOut = function(t, b, c, d) {
    if ((t/=d/2) < 1) {
      return c/2 * Math.pow (t, 5) + b;
    }
    return c/2 * (Math.pow (t-2, 5) + 2) + b;
  };
  that.tweens.sinIn = function(t, b, c, d) {
    return c * (1 - Math.cos(t/d * (Math.PI/2))) + b;
  };
  that.tweens.sinOut = function(t, b, c, d) {
    return c * Math.sin(t/d * (Math.PI/2)) + b;
  };
  that.tweens.sinInOut = function(t, b, c, d) {
    return c/2 * (1 - Math.cos(Math.PI*t/d)) + b;
  };
  that.tweens.expIn = function(t, b, c, d) {
    return c * Math.pow(2, 10 * (t/d - 1)) + b;
  };
  that.tweens.expOut = function(t, b, c, d) {
    return c * (-Math.pow(2, -10 * t/d) + 1) + b;
  };
  that.tweens.expInOut = function(t, b, c, d) {
    if ((t/=d/2) < 1) {
      return c/2 * Math.pow(2, 10 * (t - 1)) + b;
    }
    return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
  };
  that.tweens.circIn = function(t, b, c, d) {
    return c * (1 - Math.sqrt(1 - (t/=d)*t)) + b;
  };
  that.tweens.circOut = function(t, b, c, d) {
    return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
  };
  that.tweens.circInOut = function(t, b, c, d) {
    if ((t/=d/2) < 1) {
      return c/2 * (1 - Math.sqrt(1 - t*t)) + b;
    }
    return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
  };
  that.animate = function(target, keypath, opts) {
    return new this.Animation(target, keypath, opts);
  };
  that.Animation = (function(CG5) {
    var animation = function(target, keypath, opts) {
      opts = opts || {};
      this.target = target;
      this.setKeypath(keypath);
      if (opts.hasOwnProperty("updater")) {
        this.setUpdater(opts.updater);
      }
      var member = target[createGetter(keypath)], tmp, goodTmp;
      if (typeof member === "function") {
        tmp = member.apply(target);
      } else {
        tmp = member;
      }
      goodTmp = typeof tmp === "number";
      this.setFrom( (opts.hasOwnProperty("from") ? opts.from : goodTmp ? tmp : 0) ); // TODO: 3 init with array type?
      this.setChange( (opts.hasOwnProperty("to") ? opts.to - this.from() : (goodTmp ? tmp : 0)  - this.from()) );
    };

    animation.prototype.start = 0;
    syntheticProperty(animation.prototype, "duration", null, null, 300);
    syntheticProperty(animation.prototype, "tweener", null, null, CG5.tweens.quadInOut);
    syntheticProperty(animation.prototype, "keypath", null, null, "empty");
    syntheticProperty(animation.prototype, "updater", null, null, CG5._displaySource(true));
    syntheticProperty(animation.prototype, "from", null, null, 0);
    syntheticProperty(animation.prototype, "change", null, null, 0);
    syntheticProperty(animation.prototype, "after", null, null, null);
    dynamicProperty(animation.prototype, "to", function(arg) {
      if (arguments.length >= 1) {
        return this.setTo(arg);
      }
      var change = this.change(), from = this.from();
      if (Array.isArray(change)) {
        var ret = [];
        change.forEach(function(comp, i) {
          ret.push(from[i] - comp);
        });
        return ret;
      }
      return this.from() + this.change();
    }, function(val) {
      var change, tmp;
      var from = this.from(), tweener = this.tweener();
      if (Array.isArray(val)) {
        from = ensure_length(from, val.length);
        this.setFrom(from);
        tweener = ensure_length(tweener, val.length);
        this.setTweener(tweener);
        change = [];
        val.forEach(function(comp, i) {
          change.push(comp - from[i]);
        });
      } else {
        if (Array.isArray(from)) {
          from = from[0];
          this.setFrom(from);
        }
        if (Array.isArray(tweener)) {
          tweener = tweener[0];
          this.setTweener(tweener);
        }
        change = val - from;
      }
      return this.setChange(change);
    });
    animation.createSource = function(ani) { // TODO: 4 make sources have targets, I hate not having this here - on hold, this is already a mess gah
      var setterBased = typeof ani.target[ani._keypath] === "function";
      if (Array.isArray(ani._change)) {
        if (setterBased) {
          return function() {
            var time = Date.now() - ani.start;
            if (time >= ani._duration) {
              time = ani._duration;
              ani.stop();
            }
            var ret = [];
            ani._change.forEach(function(comp, i) { // TODO: 3 check performance?
              ret.push(ani._tweener[i](time, ani._from[i], comp, ani._duration));
            });
            ani.target[ani._keypath](ret, true);
            ani._updater();
          };
        }
        return function() {
          var time = Date.now() - ani.start;
          if (time >= ani._duration) {
            time = ani._duration;
            ani.stop();
          }
          var ret = [];
          ani._change.forEach(function(comp, i) { // TODO: 3 check performance?
            ret.push(ani._tweener[i](time, ani._from[i], comp, ani._duration));
          });
          ani.target[ani._keypath] = ret;
          ani._updater();
        };
      }
      if (setterBased) {
        return function() {
          var time = Date.now() - ani.start;
          if (time >= ani._duration) {
            time = ani._duration;
            ani.stop();
          }
          ani.target[ani._keypath](ani._tweener(time, ani._from, ani._change, ani._duration), true);
          ani._updater();
        };
      }
      return function() {
        var time = Date.now() - ani.start;
        if (time >= ani._duration) {
          time = ani._duration;
          ani.stop();
        }
        ani.target[ani._keypath] = ani._tweener(time, ani._from, ani._change, ani._duration);
        ani._updater();
      };
    };
    animation.prototype.go = function() {
      if (this.target.willAnimate) {
        this.target.willAnimate(this._keypath, this);
      }
      this.start = Date.now();
      this.source = animation.createSource(this);
      GFXRunloop.addSource(this.source);
      return this;
    };
    animation.prototype.stop = function() {
      GFXRunloop.removeSource(this.source);
      if (this.target.didAnimate) {
        this.target.didAnimate(this._keypath, this);
      }
      if (this.after()) {
        this.after()();
      }
      return this;
    };
    return animation;
  }(that));
  // }}}
  
  // CG5.View {{{
  that.View = (function(CG5) {
    var view = function(rect) {
      this.setRect(rect);
    };
    
    view.prototype._drawRect = function(rect) {
      this.drawRect(rect);
      this.needsDisplay = false;
    };

    syntheticProperty(view.prototype, "rect", null, function_hooks(function(rect, y, width, height) {
      switch(arguments.length) {
        case 1:
          return CG5.rectize(rect);
        case 2:
          return CG5.rectize([rect, y]);
        case 3:
          return CG5.rectize([rect,y,width]);
        case 4:
          return CG5.rectize([rect,y,width,height]);
        default:
          throw "Invalid arguments sent to setRect";
      }
    }, function(r) {
      this.setNeedsDisplay(true);
    }), CG5.rectZero);

    view.prototype.backgroundStyleType = 0;
    view.prototype.backgroundStyle = function() {
      switch(this.backgroundStyleType) {
        case 0:
          return this.backgroundColor().string();
        case 1:
          return this.linearGradient();
        case 2:
          return this.radialGradient();
        default:
          return "rgba(0,0,0,0)";
      }
    };

    syntheticProperty(view.prototype, "backgroundColor", function_hooks(function(color) {
      return color;
    }, null), function_hooks(function(bgColor) { // TODO: 2 color object
      this.backgroundStyleType = 0;
      if (Array.isArray(bgColor)) {
        bgColor = bgColor.map(Math.floor);
        return CG5.colorFromArray(bgColor);
      }
      if (typeof bgColor === "string") {
        return CG5.colorFromString(bgColor);
      }
    }, function(bgCol) {
      this.setNeedsDisplay(true);
    }), CG5.color(0,0,0,0));
    syntheticProperty(view.prototype, "strokeColor", function_hooks(function(color) {
      return color;
    }, null), function_hooks(function(color) {
      if (Array.isArray(color)) {
        color.map(Math.floor);
        return CG5.colorFromArray(color);
      }
    }, function(a) { this.setNeedsDisplay(true); }), CG5.color(0,0,0,0));
    syntheticProperty(view.prototype, "strokeWidth", null, function_hooks(null, function(a) { this.setNeedsDisplay(true); }), 0);
    syntheticProperty(view.prototype, "path", null, function_hooks(null, function(path) {
      this.setNeedsDisplay(true);
    }), null);
    syntheticProperty(view.prototype, "cornerRadius", null, function_hooks(function(radius) {
      if (arguments.length === 1) {
        this.stopAnimating("cornerRadius");
      }
    }, function(radius) {
      this.setNeedsDisplay(true);
    }), 0);
    syntheticProperty(view.prototype, "linearGradient", function_hooks(function(grad) {
      var ctx = CG5.context, rect = this.rect();
      var startX = rect.origin.x + grad.start.x * rect.size.width, startY = rect.origin.y + rect.size.height * grad.start.y;
      var finalX = rect.origin.x + grad.finish.x * rect.size.width, finalY = rect.origin.y + rect.size.height * grad.finish.y;
      var retval = ctx.createLinearGradient(startX, startY, finalX, finalY);
      grad.colorStops.forEach(function(colorstop) {
        retval.addColorStop(colorstop.loc, colorstop.color.string());
      });
      return retval;
    }, null), function_hooks(function(bgColor) {
      this.backgroundStyleType = 1;
    }, function(bgCol) {
      this.setNeedsDisplay(true);
    }));
    syntheticProperty(view.prototype, "radialGradient", function_hooks(function(grad) {
      var ctx = CG5.context, rect = this.rect();
      var startX = rect.origin.x + grad.start.x * rect.size.width, startY = rect.origin.y + rect.size.height * grad.start.y;
      var finalX = rect.origin.x + grad.finish.x * rect.size.width, finalY = rect.origin.y + rect.size.height * grad.finish.y;
      var startR = (rect.size.width / 2) * grad.start.z, finalR = (rect.size.width / 2) * grad.finish.z;
      var retval = ctx.createRadialGradient(startX, startY, startR, finalX, finalY, finalR);
      grad.colorStops.forEach(function(colorstop) {
        retval.addColorStop(colorstop.loc, colorstop.color.string());
      });
      return retval;
    }, null), function_hooks(function(bgColor) {
      this.backgroundStyleType = 2;
    }, function(bgColor) {
      this.setNeedsDisplay(true);
    }));
    dynamicProperty(view.prototype, "center", function() {
      var origin = this.origin(), radius = this.radius();
      return CG5.pointize([origin.x + radius, origin.y + radius]);
    }, function(val) {
      if (arguments.length === 1) {
        this.stopAnimating("center");
      }
      var radius = this.radius();
      var pnt = CG5.pointize(val);
      this.setOrigin([pnt.x - radius, pnt.y - radius]);
    });
    dynamicProperty(view.prototype, "offset", function() {
      return this.origin();
    }, function(val) {
      if (arguments.length === 1) {
        this.stopAnimating("offset");
      }
      var org = this.origin();
      var pnt = CG5.pointize(val);
      this.setOrigin([org.x + pnt.x, org.y + pnt.y]);
    });
    dynamicProperty(view.prototype, "radius", function() {
      return this.rect().size.width / 2;
    }, function(val) {
      if (arguments.length === 1) {
        this.stopAnimating("radius");
      }
      var xdiff = val * 2 - this.size().width;
      var ydiff = val * 2 - this.size().height;
      if (xdiff === 0 && ydiff === 0) {
        return;
      }
      var offsetx = -xdiff / 2;
      var offsety = -ydiff / 2;
      this.setOffset([offsetx, offsety]);
      this.setSize([val * 2, val * 2]);
    });

    view.prototype.drawRect = function(rect) {
      var ctx = CG5.context, cornerRadius;
      ctx.fillStyle = this.backgroundStyle();
      if ((cornerRadius = this._cornerRadius) !== 0) {
        var topLine = rect.origin.y, leftLine = rect.origin.x, bottomLine = topLine + rect.size.height, rightLine = leftLine + rect.size.width;
        ctx.beginPath();
        
        ctx.moveTo(leftLine + cornerRadius, topLine);
        ctx.lineTo(rightLine - cornerRadius, topLine);
        ctx.arc(rightLine - cornerRadius, topLine + cornerRadius, cornerRadius, - Math.PI / 2, 0);
        ctx.lineTo(rightLine, bottomLine - cornerRadius);
        ctx.arc(rightLine - cornerRadius, bottomLine - cornerRadius, cornerRadius, 0, Math.PI / 2);
        ctx.lineTo(leftLine + cornerRadius, bottomLine);
        ctx.arc(leftLine + cornerRadius, bottomLine - cornerRadius, cornerRadius, Math.PI / 2, Math.PI);
        ctx.lineTo(leftLine, topLine + cornerRadius);
        ctx.arc(leftLine + cornerRadius, topLine + cornerRadius, cornerRadius, Math.PI, 3 * Math.PI / 2);

        ctx.closePath();
        ctx.fill();
        if (this._strokeWidth) {
          ctx.strokeStyle = this.strokeColor();
          ctx.lineWidth = this._strokeWidth;
          ctx.stroke();
        }
      } else {
        ctx.fillRect(rect.origin.x, rect.origin.y, rect.size.width, rect.size.height);
        if (this._strokeWidth) {
          ctx.strokeStyle = this.strokeColor();
          ctx.lineWidth = this._strokeWidth;
          ctx.strokeRect(rect.origin.x, rect.origin.y, rect.size.width, rect.size.height);
        }
      }
    };
    
    dynamicProperty(view.prototype, "origin", function() {
      return this.rect().origin;
    }, function(origin, y) {
      if (arguments.length === 1) {
        this.rect().origin = CG5.pointize(origin);
      } else if (arguments.length === 2) {
        this.rect().origin = CG5.point(origin,y);
      } else {
        throw "Invalid arguments passed to setOrigin";
      }
      this.setNeedsDisplay(true);
    });
    dynamicProperty(view.prototype, "size", function() {
      return this.rect().size;
    }, function(size, height) {
      if (arguments.length === 1) {
        this.rect().size = CG5.sizeize(size);
      } else if (arguments.length === 2) {
        this.rect().size = CG5.size(size, height);
      } else {
        throw "Invalid arguments passed to setSize";
      }
      this.setNeedsDisplay(true);
    });
    
    view.prototype.animating = 0;
    view.prototype.animations = {};
    view.prototype.stopAnimating = function(getter) {
      var ani;
      if ((ani = this.animationForMethod(getter)) !== undefined && ani !== null) {
        ani.stop();
      }
      return this;
    };
    view.prototype.animationForMethod = function(method) {
      return this.animations[method];
    };
    view.prototype.willAnimate = function(method, animation) {
      this.animating++;
      this.animations[createGetter(method)] = animation;
    };
    view.prototype.didAnimate = function(method, animation) {
      this.animating--;
      delete this.animations[createGetter(method)];
    };

    view.prototype.needsDisplay = true;
    view.prototype.setNeedsDisplay = function(all) {
      if (this.animating !== 0) {
        return;
      }
      this.needsDisplay = true;
      if (CG5.hasView(this)) {
        CG5.setNeedsDisplay(all);
      }
    };

    return view;
  }(that));
  // }}} 
  
  // Hierarchy {{{
  that.addView = function(view) {
    views.push(view);
    this.setNeedsDisplay(false);
  };

  that.hasView = function(view) {
    return views.indexOf(view) !== -1;
  };

  that.removeView = function(view) {
    var index;
    if ((index = views.indexOf(view)) !== -1) {
      views.splice(index, 1);
      this.setNeedsDisplay(true);
    }
  };

  that.setNeedsDisplay = function(forceAll) {
    GFXRunloop.addSource(CG5._displaySource(forceAll), GFXRunloop.SourceTypes.OneShot);
  };
  // }}}

  return that;
}());

