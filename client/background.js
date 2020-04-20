$(document).ready(function () {

// gradient background
    window.onmousemove = function (e) {

        var x = Math.min(1, Math.max(0, e.pageX / window.innerWidth));
        var y = Math.min(1, Math.max(0, e.pageY / window.innerHeight));

        const ARC = 40;
        const ROOT = 240;

        var left = 'hsl(' + ((x + y) * ARC + ROOT - ARC) + ', 100%, 45%)';
        var right = 'hsl(' + ((x + y) * ARC + ROOT - 30 - ARC) + ', 100%, 60%)';


        $('#page-content').css(
            'background',
            'linear-gradient(to bottom right, ' + left + ', ' + right + ')');
    };

});
