# CG5
## What?
CG5 originally stood for CoreGraphics for HTML5 but quickly evolved into something else. CG5 aims to create a user interface suite for the web. It contains classes for views and animations, allowing complex and intricate websites to be created.
## Why?
I personally don't like writing HTML or CSS (or any of the other languages that compile down to these languages). I personally like writing things while using full grown languages, such as javascript*. Thus I created this framework which allows creation of a robust website without the need to ever touch HTML or CSS.
## How?
CG5 uses the HTML5 canvas technology in order to render its content. As of now you can only have one canvas on the page to render on. Create that canvas and then initialize the CG5 framework by calling `initialize()` on the CG5 global object. A code example below:
```javascript
var canvas = // Somehow get the canvas DOM node
CG5.initialize(canvas);
```
Next you can create `View` objects galore and then add them to the canvas like so:
```javascript
var view = new CG5.View([0,0,100,100]);
CG5.addView(view);
```
where `[0,0,100,100]` stand for the rect of the view. You can do many other things with this framework, check out the documentation for further information.

## Roadmap
- Add paths for views. In other words currently views can only be rectangles (of course you can create your own `drawRect` method in order to draw some other shape, but I want to make this easier), or rounded rectangles, but I want the views to be able to have any sort of boundary one would like (creating the boundaries with different types of curves, quadratic, cubic, etc.). Currently I have an idea how to do this, but need to figure out how to make a simpler API.
- ScrollView. This is gunna take some work. Currently I see that I'm going to be using the mousewheel event, canceling it if I'm within a scrollview (means I'll have to implement some sort of `hitTest` function). Should be interesting to see how this works out... No idea how it'll work on mobile devices oh lord. Possibly going to add another `<canvas>` element and then taking the scrolling from the browser itself. This is probably favorable, but then I cannot have as cool of animations and the such. I would love input if anyone had any!

## File Structure
Currently I have the `CG5` framework in the file `cg5.js` in the root of the repo. The file `script.js` is a testing file that I use (currently I have two tests). The `index.html` file is used with `script.js` to test the framework. The `fjs.js` script is a script that adds some convenience methods to arrays and objects.

## Contributions
If you want to help out then fork, create a branch with your feature/fix and then create a PR for said branch. I'm interested in help from others, as long as the code is sane. Note it must pass JSLint with defaults enabled.

## License
Check out LICENSE.md

## Special Thanks
Thanks to [Robert Penner](http://www.robertpenner.com) for his write ups on easing functions. I use code that he wrote in a portion of his book that he has published onto the internet (Chapter 7 on tweening). He's clearly a very intelligent guy, and you guys should read the code he has written. As far as I can tell, he wrote the easing functions that jQuery uses. Thanks a bunch Robert!

Thanks to [JD Hartley](http://jdhartley.me) for teaching me how to write javascript properly and giving me free code reviews. Also thanks for sushi. One of the best web devs I have ever met.

Thanks to [John Heaton](http://jheat.me) for teaching me a great bit about how javascript works internally. He's one of the greatest coders I have ever met.

Thanks to all my other coder friends who have taught me a thing or two along the way.

Thanks to Michael Deal for his brillant [article](http://www.html5rocks.com/en/tutorials/canvas/texteffects/) on working with the canvas.

Thanks to the interval `[0,1]` being homeomorphic to any other interval `[a,b]` for real `a,b`.

