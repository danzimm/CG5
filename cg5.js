
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
        if (source.type === 1) {
          runner.removalQueue.push(source);
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
      /*if (all) {
        that.context.clearRect(0,0,that.screen.size.width, that.screen.size.height);
      }*/
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
    var renderSource = null;
    animation.currentAnimations = [];

    animation.prototype.start = 0;
    syntheticProperty(animation.prototype, "duration", null, null, 300);
    syntheticProperty(animation.prototype, "tweener", null, null, CG5.tweens.quadInOut);
    syntheticProperty(animation.prototype, "keypath", null, null, "empty");
    syntheticProperty(animation.prototype, "updater", null, null, null);
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
            if (ani._updater) {
              ani._updater();
            }
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
          if (ani._updater) {
            ani._updater();
          }
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
          if (ani._updater) {
            ani._updater();
          }
        };
      }
      return function() {
        var time = Date.now() - ani.start;
        if (time >= ani._duration) {
          time = ani._duration;
          ani.stop();
        }
        ani.target[ani._keypath] = ani._tweener(time, ani._from, ani._change, ani._duration);
        if (ani._updater) {
          ani._updater();
        }
      };
    };
    animation.prototype.go = function() {
      if (this.target.willAnimate) {
        this.target.willAnimate(this._keypath, this);
      }
      this.start = Date.now();
      this.source = animation.createSource(this);
      GFXRunloop.addSource(this.source);
      if (!renderSource) {
        renderSource = CG5._displaySource(true);
        GFXRunloop.addSource(renderSource); // TODO: 3 should probably ensure this is the last thing done in the GFXRunloop...
      }
      animation.currentAnimations.push(this);
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
      var index = animation.currentAnimations.indexOf(this);
      if (index > -1) {
        animation.currentAnimations.splice(index, 1);
      }
      if (animation.currentAnimations.length === 0) {
        GFXRunloop.removeSource(renderSource);
        renderSource = null;
      }
      return this;
    };
    return animation;
  }(that));
  // }}}

  // CG5Path {{{
  that.Segment = {};
  that.Segment.MoveTo = (function(CG5) {
    var segment = function(x,y) {
      this.setPoint([x,y]);
    };
    syntheticProperty(segment.prototype, "point", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    segment.prototype.drawInContext = function(ctx, rect) {
      var x = this._point.x, y = this._point.y;
      x = x * rect.size.width + rect.origin.x;
      y = y * rect.size.height + rect.origin.y;
      ctx.moveTo(x,y);
      return this;
    };
    return segment;
  }(that));
  that.Segment.LineTo = (function(CG5) {
    var segment = function(x,y) {
      this.setPoint([x,y]);
    };
    syntheticProperty(segment.prototype, "point", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    segment.prototype.drawInContext = function(ctx, rect) {
      var x = this._point.x, y = this._point.y;
      x = x * rect.size.width + rect.origin.x;
      y = y * rect.size.height + rect.origin.y;
      ctx.lineTo(x,y);
      return this;
    };
    return segment;
  }(that));
  that.Segment.Arc = (function(CG5) {
    var segment = function(x,y,r,sa,ea,anti) {
      this.setPoint([x,y]).setRadius(r).setStartAngle(sa).setEndAngle(ea).setAntiClockwise(anti);
    };
    syntheticProperty(segment.prototype, "point", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    syntheticProperty(segment.prototype, "radius", null, null, 0);
    syntheticProperty(segment.prototype, "startAngle", null, null, 0);
    syntheticProperty(segment.prototype, "endAngle", null, null, 0);
    syntheticProperty(segment.prototype, "antiClockwise", null, null, 0);
    segment.prototype.drawInContext = function(ctx, rect) {
      var x = this._point.x, y = this._point.y, r = this._radius, sa = this._startAngle, ea = this._endAngle, anti = this._antiClockwise;
      x = x * rect.size.width + rect.origin.x;
      y = y * rect.size.height + rect.origin.y;
      r = r * ( rect.size.width + rect.size.height ) / 2; 
      ctx.arc(x,y,r,sa,ea,anti);
      return this;
    };
    return segment;
  }(that));
  that.Segment.ArcTo = (function(CG5) {
    var segment = function(x,y, x1, y1, r) {
      this.setPoint([x,y]).setEndPoint([x1,y1]).setRadius(r);
    };
    syntheticProperty(segment.prototype, "point", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    syntheticProperty(segment.prototype, "endPoint", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    syntheticProperty(segment.prototype, "radius", null, null, 0);
    segment.prototype.drawInContext = function(ctx, rect) {
      var x = this._point.x, y = this._point.y, x1 = this._endPoint.x, y1 = this._endPoint.y, r = this._radius;
      x = x * rect.size.width + rect.origin.x;
      y = y * rect.size.height + rect.origin.y;
      x1 = x1 * rect.size.width + rect.origin.x;
      y1 = y1 * rect.size.height + rect.origin.y;
      r = r * ( rect.size.width + rect.size.height ) / 2;
      ctx.arcTo(x,y,x1,y1,r);
      return this;
    };
    return segment;
  }(that));
  that.Segment.BezierCurveTo = (function(CG5) {
    var segment = function(cx,cy,cx1,cy1,x,y) {
      this.setControlPoint([cx,cy]).setControlPointTwo([cx1,cy1]).setPoint([x,y]);
    };
    syntheticProperty(segment.prototype, "point", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    syntheticProperty(segment.prototype, "controlPoint", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    syntheticProperty(segment.prototype, "controlPointTwo", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    segment.prototype.drawInContext = function(ctx, rect) {
      var cx = this._controlPoint.x, cy = this._controlPoint.y, cx1 = this._controlPointTwo.x, cy1 = this._controlPointTwo.y, x = this._point.x, y = this._point.y;
      cx = cx * rect.size.width + rect.origin.x;
      cy = cy * rect.size.height + rect.origin.y;
      cx1 = cx1 * rect.size.width + rect.origin.x;
      cy1 = cy1 * rect.size.height + rect.origin.y;
      x = x * rect.size.width + rect.origin.x;
      y = y * rect.size.height + rect.origin.y;
      ctx.bezierCurveTo(cx,cy,cx1,cy1,x,y);
      return this;
    };
    return segment;
  }(that));
  that.Segment.QuadraticCurveTo = (function(CG5) {
    var segment = function(cx, cy, x,y) {
      this.setControlPoint([cx,cy]).setPoint([x,y]);
    };
    syntheticProperty(segment.prototype, "point", null, null, CG5.point(0,0));
    syntheticProperty(segment.prototype, "point", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    syntheticProperty(segment.prototype, "controlPoint", null, function_hooks(function(pnt) {
     if (Array.isArray(pnt)) {
       return CG5.pointize(pnt);
     }
    }, null), CG5.point(0,0));
    segment.prototype.drawInContext = function(ctx, rect) {
      var cx = this._controlPoint.x, cy = this._controlPoint.y, x = this._point.x, y = this._point.y;
      cx = cx * rect.size.width + rect.origin.x;
      cy = cy * rect.size.height + rect.origin.y;
      x = x * rect.size.width + rect.origin.x;
      y = y * rect.size.height + rect.origin.y;
      ctx.quadraticCurveTo(cx,cy,x,y);
      return this;
    };
    return segment;
  }(that));

  that.path = function() {
    return new this.Path();
  };
  that.Path = (function(CG5) {
    var segType;
    var path = function() {
      this.segments = []; // Not sure if I should put in prototype or what
    };
    var functions = ["moveTo", "lineTo", "arc", "arcTo", "bezierCurveTo", "quadraticCurveTo"];
    functions.forEach(function(func) {
      var cap = capitalize(func);
      path.prototype[func] = function(a,b,c,d,e,f) {
        this.segments.push(new CG5.Segment[cap](a,b,c,d,e,f));
        return this;
      };
    });
    Object.defineProperty(path.prototype, "length", {
      get: function() {
        return this.segments.length;
      }
    });
    path.prototype.addSegment = function(segment) {
      this.segments.push(segment);
      return this;
    };
    path.prototype.segment = function(index) {
      return this.segments[index];
    };
    path.prototype.drawInContext = function(ctx,rect) {
      this.segments.forEach(function(segment) {
        segment.drawInContext(ctx,rect);
      });
      return this;
    };
    path.rect = function() {
      return CG5.path().rect(0,0,1,1);
    };
    path.rectReversed = function(rect) {
      return CG5.path().moveTo(0,0).lineTo(0,1).lineTo(1,1).lineTo(1,0).lineTo(0,0);
    };
    path.rectRounded = function(topLeft, topRight, bottomLeft, bottomRight) {
      var retval = CG5.path().moveTo(topLeft, 0)
        .lineTo(1 - topRight, 0)
        .arc(1 - topRight, topRight, topRight, 3 * Math.PI / 2, 0)
        .lineTo(1, 1 - bottomRight)
        .arc(1 - bottomRight, 1 - bottomRight, bottomRight, 0, Math.PI / 2)
        .lineTo(bottomLeft, 1)
        .arc(bottomLeft, 1 - bottomLeft, bottomLeft, Math.PI / 2, Math.PI)
        .lineTo(0, topLeft)
        .arc(topLeft, topLeft, topLeft, Math.PI, 3 * Math.PI / 2);
      retval.setRadius = function(radius) {
        this.segment(0).point().x = radius;
        this.segment(1).point().x = 1 - radius;
        this.segment(2).setRadius(radius).setPoint([1 - radius, radius]);
        this.segment(3).point().y = 1 - radius;
        this.segment(4).setRadius(radius).setPoint([1 - radius, 1 - radius]);
        this.segment(5).point().x = radius;
        this.segment(6).setRadius(radius).setPoint([radius, 1 - radius]);
        this.segment(7).point().y = radius;
        this.segment(8).setRadius(radius).setPoint([radius, radius]);
      };
      return retval;
    };
    path.rectRoundedReversed = function(topLeft, topRight, bottomLeft, bottomRight) {
      var retval = CG5.path().moveTo(topLeft, 0)
        .arc(topLeft, topLeft, topLeft, 3 * Math.PI / 2, Math.PI, true)
        .lineTo(0, 1 - bottomLeft)
        .arc(bottomLeft, 1 - bottomLeft, bottomLeft, Math.PI, Math.PI / 2, true)
        .lineTo(1 - bottomRight, 1)
        .arc(1 - bottomRight, 1 - bottomRight, bottomRight, Math.PI / 2, 0, true)
        .lineTo(1, topRight)
        .arc(1 - topRight, topRight, topRight, 0, 3 * Math.PI / 2, true)
        .lineTo(topLeft, 0);

      retval.setRadius = function(radius) {
        this.segment(0).point().x = radius;
        this.segment(1).setRadius(radius).setPoint([radius,radius]);
        this.segment(2).point().y = 1 - radius;
        this.segment(3).setRadius(radius).setPoint([radius, 1 - radius]);
        this.segment(4).point().x = 1 - radius;
        this.segment(5).setRadius(radius).setPoint([1 - radius, 1 - radius]);
        this.segment(6).point().y = radius;
        this.segment(7).setRadius(radius).setPoint([1 - radius, radius]);
        this.segment(8).point().x = radius;
      };
      return retval;
    };
    return path;
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

    syntheticProperty(view.prototype, "backgroundColor", null, function_hooks(function(bgColor) { // TODO: 2 color object
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
    syntheticProperty(view.prototype, "strokeColor", null, function_hooks(function(color) {
      if (Array.isArray(color)) {
        color.map(Math.floor);
        return CG5.colorFromArray(color);
      }
      if (typeof color === "string") {
        return CG5.colorFromString(color);
      }
    }, function(a) { this.setNeedsDisplay(true); }), CG5.color(0,0,0,0));
    syntheticProperty(view.prototype, "strokeWidth", null, function_hooks(null, function(a) { this.setNeedsDisplay(true); }), 0);

    syntheticProperty(view.prototype, "shadowColor", null, function_hooks(function(color) {
      if (Array.isArray(color)) {
        color.map(Math.floor);
        return CG5.colorFromArray(color);
      }
      if (typeof color === "string") {
        return CG5.colorFromString(color);
      }
    }, function(a) { this.setNeedsDisplay(true); }), CG5.color(0,0,0,0));
    syntheticProperty(view.prototype, "shadowBlur", null, null, 0);
    syntheticProperty(view.prototype, "shadowOffset", null, null, CG5.point(0,0));
    
    syntheticProperty(view.prototype, "innerShadowColor", null, function_hooks(function(color) {
      if (Array.isArray(color)) {
        color.map(Math.floor);
        return CG5.colorFromArray(color);
      }
      if (typeof color === "string") {
        return CG5.colorFromString(color);
      }
    }, function(a) { this.setNeedsDisplay(true); }), CG5.color(0,0,0,0));
    syntheticProperty(view.prototype, "innerShadowBlur", null, null, 0);
    syntheticProperty(view.prototype, "innerShadowOffset", null, null, CG5.point(0,0));

    syntheticProperty(view.prototype, "path", null, function_hooks(null, function(path) {
      this.setNeedsDisplay(true);
    }), null);
    syntheticProperty(view.prototype, "reversePath", null, function_hooks(null, function(path) {
      this.setNeedsDisplay(true);
    }), null);
    syntheticProperty(view.prototype, "cornerRadius", null, function_hooks(function(radius) {
      if (arguments.length === 1) {
        this.stopAnimating("cornerRadius");
      }
      if (!this._cornerRadiusPath) {
        this._cornerRadiusPath = CG5.Path.rectRoundedReversed(radius, radius, radius, radius);
      }
      this._cornerRadiusPath.setRadius(radius);
      this.setReversePath(null).setPath(this._cornerRadiusPath);
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
      ctx.save();
      ctx.fillStyle = this.backgroundStyle();
      
      var drawPath = this._path ? this._path.drawInContext.bind(this._path, ctx, rect) : function() {
        ctx.rect(rect.origin.x, rect.origin.y, rect.size.width, rect.size.height);
      };
      var drawPathReverse = this._reversePath ? this._reversePath.drawInContext.bind(this._reversePath, ctx, rect) : drawPath;
      var topLine = rect.origin.y, leftLine = rect.origin.x, bottomLine = topLine + rect.size.height, rightLine = leftLine + rect.size.width;

      ctx.beginPath();
      drawPath();
      if (this._shadowBlur > 0) {
        ctx.shadowBlur = this._shadowBlur;
        ctx.shadowColor = this._shadowColor.string();
        ctx.shadowOffsetX = this._shadowOffset.x;
        ctx.shadowOffsetY = this._shadowOffset.y;
      }
      ctx.fill();
      if (this._strokeWidth) {
        ctx.strokeStyle = this._strokeColor.string();
        ctx.lineWidth = this._strokeWidth;
        ctx.stroke();
      }

      if (this._innerShadowBlur > 0) {
        ctx.save();
        ctx.fillStyle = "#000";
        ctx.shadowColor = this._innerShadowColor.string();
        ctx.shadowBlur = this._innerShadowBlur;
        ctx.shadowOffsetX = this._innerShadowOffset.x;
        ctx.shadowOffsetY = this._innerShadowOffset.y;

        ctx.beginPath();

        drawPath();

        ctx.clip();

        ctx.beginPath();
        ctx.rect(leftLine - 25, topLine - 25, rect.size.width + 50, rect.size.height + 50);
        
        drawPathReverse();
        
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
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
    return this;
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
    return this;
  };
  
  that.moveViewToFront = function(view) {
    var index;
    if ((index = views.indexOf(view)) !== -1) {
      views.move(index,views.length-1);
    }
    return this;
  };
  that.moveViewToBack = function(view) {
    var index;
    if ((index = views.indexOf(view)) !== -1) {
      views.move(index,0);
    }
    return this;
  };
  /*
  that.moveViewInFrontOfView = function(viewa, viewb) {
    // TODO: implement this
  };
  */

  that.setNeedsDisplay = function(forceAll) {
    GFXRunloop.addSource(CG5._displaySource(forceAll), GFXRunloop.SourceTypes.OneShot);
    return this;
  };
  // }}}

  return that;
}());

