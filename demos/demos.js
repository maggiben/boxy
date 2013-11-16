var ctx = null; // lame global ^_^

var canvasWidth;
var canvasHeight;
var canvasTop;
var canvasLeft;

function disableSelection(target) {
    if (typeof target.onselectstart != "undefined") //IE route
    target.onselectstart = function () {
        return false
    };

    else if (typeof target.style.MozUserSelect != "undefined") //Firefox route
    target.style.MozUserSelect = "none";

    else //All other route (ie: Opera)
    target.onmousedown = function () {
        return false
    };
}

function handleResize() {
    var canvasElm = jQuery('#world');
    canvasWidth = parseInt(canvasElm.width);
    canvasHeight = parseInt(canvasElm.height);
    canvasTop = parseInt(canvasElm.offset().top);
    canvasLeft = parseInt(canvasElm.offset().left);
}

jQuery(window).load(function () {
    var canvasElm = jQuery('#world');
    handleResize();
    jQuery(window).resize(handleResize);
    disableSelection(canvasElm.get(0));

    jQuery( document ).ready(function() {
        function clickPoint(event) {
            return {
                x: event.pageX || (event.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft)),
                y: event.pageY || (event.clientY + (document.documentElement.scrollTop || document.body.scrollTop))
            };
        };
        jQuery('#world').click(function (e) {
            var position = clickPoint(e);
            if (Math.random() < 0.5) {
                cir = ctx.circle(position.x - canvasLeft, position.y - canvasTop, 10);
                cir.attr({
                    class: 'ball'
                }).physics({
                    density: 0.3,
                    friction: 0.5,
                    restitution: 0.9,
                    isSensor: 0,
                    fixedRotation: 1,
                    fixed: false
                });
                ctx.world2d.addFixture(cir);
            } else {
                bx = ctx.rect(position.x - canvasLeft, position.y - canvasTop, 10, 10).attr({
                    class: 'box',
                }).physics({
                    density: 0.3,
                    friction: 0.5,
                    restitution: 0.9,
                    isSensor: 0,
                    fixedRotation: 1,
                    fixed: false
                });
                ctx.world2d.addFixture(bx);
            }
            e.stopPropagation();
            return false;
        }).dblclick(function (e) {
            e.stopPropagation();
        });

        console.log("ready");
        ctx = Snap('#world');
        wx = ctx.createWorld();
        console.log(wx);
        world2d = ctx.world2d.create();


        var pat = ctx.path("M10-5-10,15M15,0,0,15M0-5-20,15").attr({
            fill: "none",
            stroke: "#bada55",
            strokeWidth: 5
        });
        p = pat.pattern(0, 0, 10, 10);
        for (var i = 20; i--;) {
            circle = ctx.circle(32 * i + 25, 30, 10).attr({
                stroke: '#cdef3f',
                strokeWidth: 1,
                fill: p
            }).physics({
                density: 0.1,
                friction: 0.8,
                restitution: 0.2,
                isSensor: 0,
                fixedRotation: 1,
                fixed: false
            });
            wx.addFixture(circle);
        }

        var pendulum = ctx.rect(275, 265, 75, 5).attr({
            class: 'box',
        }).physics({
            density: 0.3,
            friction: 0.5,
            restitution: 0.9,
            isSensor: 0,
            fixedRotation: 1,
            fixed: false
        });
        x1 = wx.addFixture(pendulum);

        var jointDef = new b2RevoluteJointDef();
        jointDef.body1 = x1;
        jointDef.body2 = wx.world.GetGroundBody();
        jointDef.anchorPoint = x1.GetCenterPosition();
        wx.world.CreateJoint(jointDef);

        floor = ctx.rect(0, 390, 600, 10).attr({
            class: 'box',
        }).physics({
            density: 0.3,
            friction: 0.5,
            restitution: 0.9,
            isSensor: 0,
            fixedRotation: 1,
            fixed: true
        });
        wx.addFixture(floor);


        for(var i = 0; i < 600; i += 50) {
            poly = ctx.polygon([[i + 20, 150], [i + 30, 170], [i + 10, 170]]).attr({
                class: 'box',
            }).physics({
                density: 0.3,
                friction: 0.5,
                restitution: 0.9,
                isSensor: 0,
                fixedRotation: 1,
                fixed: true
            });
            wx.addFixture(poly);
        }

        wx.run();
        setTimeout(function(){
            window.isStopped = true;
        },5000)
    });
});

/*
jQuery(window).load(function () {
    var canvasElm = jQuery('#world');
    handleResize();
    jQuery(window).resize(handleResize);
    disableSelection(canvasElm.get(0));

    jQuery( document ).ready(function() {
        function clickPoint(event) {
            return {
                x: event.pageX || (event.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft)),
                y: event.pageY || (event.clientY + (document.documentElement.scrollTop || document.body.scrollTop))
            };
        };
        jQuery('#world').click(function (e) {
            var position = clickPoint(e);
            if (Math.random() < 0.5) {
                cir = ctx.circle(position.x - canvasLeft, position.y - canvasTop, 10);
                cir.attr({
                    class: 'ball'
                }).physics({
                    density: 0.3,
                    friction: 0.5,
                    restitution: 0.9,
                    isSensor: 0,
                    fixedRotation: 1,
                    fixed: false
                });
                ctx.world2d.addFixture(cir);
            } else {
                bx = ctx.rect(position.x - canvasLeft, position.y - canvasTop, 10, 10).attr({
                    class: 'box',
                }).physics({
                    density: 0.3,
                    friction: 0.5,
                    restitution: 0.9,
                    isSensor: 0,
                    fixedRotation: 1,
                    fixed: false
                });
                ctx.world2d.addFixture(bx);
            }
            e.stopPropagation();
            return false;
        }).dblclick(function (e) {
            e.stopPropagation();
        });

        console.log("ready");
        ctx = Snap('#world');
        console.log(ctx.createWorld())
        world2d = ctx.world2d.create();
        //demos.InitWorlds[0](world);
        var pat = ctx.path("M10-5-10,15M15,0,0,15M0-5-20,15").attr({
            fill: "none",
            stroke: "#bada55",
            strokeWidth: 5
        });
        p = pat.pattern(0, 0, 10, 10);
        for (var i = 20; i--;) {
            circle = ctx.circle(32 * i + 25, 20, 10).attr({
                stroke: '#cdef3f',
                strokeWidth: 1,
                fill: p
            }).physics({
                density: 0.5,
                friction: 0.9,
                restitution: 0.9,
                isSensor: 0,
                fixedRotation: 1,
                fixed: false
            });
            world2d.addFixture(circle);
        }
        for(var i = 0; i < 600; i += 50) {
            poly = ctx.polygon([[i + 20, 150], [i + 30, 170], [i + 10, 170]]).attr({
                class: 'box',
            }).physics({
                density: 0.3,
                friction: 0.5,
                restitution: 0.9,
                isSensor: 0,
                fixedRotation: 1,
                fixed: true
            });
            //world2d.addFixture(poly);
        }

        var pendulum = ctx.rect(275, 265, 75, 5).attr({
            class: 'box',
        }).physics({
            density: 0.3,
            friction: 0.5,
            restitution: 0.9,
            isSensor: 0,
            fixedRotation: 1,
            fixed: false
        });
        x1 = world2d.addFixture(pendulum);

        var jointDef = new b2RevoluteJointDef();
        jointDef.body1 = x1;
        jointDef.body2 = world2d.world.GetGroundBody();
        jointDef.anchorPoint = x1.GetCenterPosition();
        world2d.world.CreateJoint(jointDef);

        floor = ctx.rect(0, 390, 600, 10).attr({
            class: 'box',
        }).physics({
            density: 0.3,
            friction: 0.5,
            restitution: 0.9,
            isSensor: 0,
            fixedRotation: 1,
            fixed: true
        });
        world2d.addFixture(floor);

        // pendulum
        var i;
        var L = 170;
        var spacing = 40;
        var jointDef = new b2RevoluteJointDef();
        var ground = world2d.world.GetGroundBody();
        jointDef.body1 = ground;
        jointDef.anchorPoint.Set(250 - spacing, 0);

        ball = ctx.circle(250 - spacing - L, 0, 20).attr({
            class: 'poly'
        }).physics({
            density: 0.5,
            friction: 0.9,
            restitution: 0.9,
            isSensor: 0,
            fixedRotation: 1,
            fixed: false
        });
        jointDef.body2 = world2d.addFixture(ball);
        world2d.world.CreateJoint(jointDef);



        ctx.world2d.run();
    });
});
*/