// create a wrapper around native canvas element (with id="c")
var canvas = new fabric.Canvas('c');


window.onresize = function() {

    scale = Math.min(window.innerWidth / 16, window.innerHeight / 9);

    canvas.setWidth(scale * 16);
    canvas.setHeight(scale * 9);
    canvas.calcOffset();
};
// create a rectangle object
canvas.backgroundColor="#2B303A";