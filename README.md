# CG5
## What?
CG5 originally stood for CoreGraphics for HTML5 but quickly evolved into something else. CG5 aims to create a user interface sweet for the web. It contains classes for views and animations, allowing complex and intricate websites to be created.
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
- Shadows on views. Both inset and outset. Different colors, different sizes. This, at first glance to me is going to be very hard!
- Animate object members. Currently one can only animate with a some sort of setter function (this is because the views themselves are built upon a robust property system that allows some pretty cool modularity to the views). This should be done in the near future.
- Colors. I need to make a color object which has an `array()` method. Using regex to fetch an array representing a color is *not* very efficient, especially when animating. This shouldn't be hard but is coupled with the issue below.
- Proper classes for point, rect, size, etc.. Currently I have these objects as a simple javascript `Object`. I want to make them more robust similar to views.

## File Structure
Currently I have the `CG5` framework in the file `cg5.js` in the root of the repo. The file `script.js` is a testing file that I use (currently I have two tests). The `index.html` file is used with `script.js` to test the framework. The `fjs.js` script is a script that adds some convenience methods to arrays and objects.

## Contributions
If you want to help out then fork, create a branch with your feature/fix and then create a PR for said branch. I'm interested in help from others, as long as the code is sane. Note it must pass JSLint with defaults enabled.

## License
Check out LICENSE.md

