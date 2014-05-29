
var window = window || {},
    document = document || {},
    CG5 = CG5 || {};

window.onload = function() {
  var canvas = document.getElementsByTagName("canvas")[0];
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  CG5.initialize(canvas);
  
  var backgroundView = new CG5.View(CG5.rect(0,0,CG5.screen.size.width, CG5.screen.size.height)).setBackgroundColor("#C8C8C8");
  CG5.addView(backgroundView);

  var tst = 1;

  if (tst === 0) {
    var colors = ["#97C757", "#57C7C4", "#5764C7", "#A457C7", "#C757B7", "#C75768", "#C78057", "#C7C557"];
    colors = colors.map(CG5.colorFromString,CG5);

    var createBlock = function(color, i) {
      var view = new CG5.View([0,0,100,100]).setBackgroundColor(color).setCornerRadius(0);
      if (i % 2 === 0) {
        view.setInnerShadowColor(CG5.color(0,0,0,1)).setInnerShadowBlur(5);
      } else {
        view.setShadowColor(CG5.color(0,0,0,1)).setShadowBlur(5);
      }
      CG5.addView(view);
      var moveToRandomPoint = function() {
        var radius = view.radius();
        var from = view.center().array();
        var to = CG5.pointRandom(CG5.rectInset(CG5.screen, [radius,radius,radius,radius])).array();
        var animation = CG5.animate(view, "setCenter").setFrom(from)
          .setTo(to).setDuration(900).tweener(CG5.tweens.flatten().random(2))
          .after(function() {
          setTimeout(moveToRandomPoint, 300);
        }).go();
        CG5.animate(view, "backgroundColor").setFrom(view.backgroundColor().array()).setTo(colors.random().array())
          .setDuration(500).go();
      };
      setTimeout(moveToRandomPoint, 300);
    };
    colors.forEach(createBlock);
    /*
    colors.forEach(createBlock);
    colors.forEach(createBlock);
    colors.forEach(createBlock);
    colors.forEach(createBlock);
    */
  }

  if (tst === 1) {
    var spotlightView = new CG5.View([0,0,40,40]).setBackgroundColor("#97C757").setCornerRadius(5);//.setStrokeWidth(2);//.setRadialGradient(CG5.singleColorRadialGradient("#97C757"));
    CG5.addView(spotlightView);
    var timerID = -1;
    var mousePosition = { x: -1, y: -1 };
    var mouseDown = false;
    window.onmousemove = function(event) {
      var clix = event.clientX, cliy = event.clientY, radius;
      if (clix === mousePosition.x && cliy === mousePosition.y) { // TODO: is this right?
        return;
      }
      mousePosition.x = clix;
      mousePosition.y = cliy;
      try {
        clearTimeout(timerID);
      } catch(e) {}
      radius = spotlightView.radius();
      spotlightView.setCornerRadius(radius);
      spotlightView.setOrigin(CG5.point(clix - radius, cliy - radius));
      if (!mouseDown) {
        timerID = setTimeout(function() {
          CG5.animate(spotlightView, "cornerRadius").to(5).go();
        }, 300);
      }
    };
    window.onmousedown = function(event) {
      mouseDown = true;
      try {
        clearTimeout(timerID);
      } catch(e) {}
      spotlightView.setCornerRadius(spotlightView.radius());
    };
    window.onmouseup = function(event) {
      mouseDown = false;
      CG5.animate(spotlightView, "cornerRadius").to(5).go();
    };
    var MouseWheelHandler = function(event) {
      console.log("Got delta: " + event.wheelDelta);
      if (event.preventDefault) {
        event.preventDefault();
      }
      event.returnValue = false;
      return false;
    };
    window.addEventListener("mousewheel", MouseWheelHandler, false);
    window.addEventListener("DOMMouseScroll", MouseWheelHandler, false);
  }
};

