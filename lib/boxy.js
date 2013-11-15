Snap.plugin(function (Snap, Element, Paper, glob) {
    var elproto = Element.prototype;
    var paproto = Paper.prototype;
    var $ = Snap._.$;

    var defaults = {
        step: 1.0/60.0,
        velocityIterations: 8,
        positionIterations: 3
    };
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    var requestAnimFrame = (function(){
        return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    Paper.prototype.world2d = {
        world: null,
        create: function(options) {
            var worldAABB = new b2AABB();
                worldAABB.minVertex.Set(-1000, -1000);
                worldAABB.maxVertex.Set(1000, 1000);
            var gravity = new b2Vec2(0, 300);
            var doSleep = true;
                this.world = new b2World(worldAABB, gravity, doSleep);
            return this;
        },
        destroy: function() {

        },
        run: function() {
            var that = this;
            function update() {
                that.world.Step(
                    defaults.step,
                    defaults.velocityIterations,    //velocity iterations
                    defaults.positionIterations     //position iterations
                );
                drawWorld();
                if(!window.isStopped)
                    requestAnimFrame(update);
            }
            function drawWorld() {
                ctx.node.suspendRedraw(10000);
                // No joins :-(
                /*for (var j = this.world.m_jointList; j; j = j.m_next) {
                    drawJoint(j);
                }*/
                for (var body = that.world.GetBodyList(); body; body = body.m_next) {
                    for (var shape = body.GetShapeList(); shape != null; shape = shape.GetNext()) {
                        drawShape(shape, body);
                    }
                }
                ctx.node.unsuspendRedrawAll();
            }
            function drawShape(shape, parentBody) {
                var pos = shape.m_position;
                var angle = parentBody.GetRotation();
                switch (shape.m_type) {
                    case b2Shape.e_circleShape:
                        if (shape.sprite) {
                            if (!(parentBody.IsSleeping() || parentBody.IsStatic())) {
                                var r = shape.m_radius;
                                var ax = shape.m_R.col1;
                                angle *= 180 / Math.PI;
                                var transform = new Snap.Matrix()
                                transform.translate(pos.x, pos.y);

                                transform.rotate(angle);
                                shape.sprite.transform(transform);
                            }
                        } else {
                            var r = shape.m_radius;
                            var ax = shape.m_R.col1;
                            shape.sprite = parentBody.shape;
                            shape.sprite.attr({
                                cx: 0,
                                cy: 0
                            })
                            var transform = new Snap.Matrix()
                            transform.translate(pos.x, pos.y);
                            shape.sprite.transform(transform);

                        }
                        break;
                    case b2Shape.e_polyShape:
                        if (shape.sprite) {
                            if (!(parentBody.IsSleeping() || parentBody.IsStatic())) {
                                angle *= 180 / Math.PI; // convert to degrees from radians
                                var transform = new Snap.Matrix()
                                transform.translate(pos.x, pos.y);
                                transform.rotate(angle);
                                shape.sprite.transform(transform);
                            }
                        } else {

                            function adjust(x, y) {
                                var cos = Math.cos(angle);
                                var sin = Math.sin(angle);
                                return [x * cos - y * sin, x * sin + y * cos];
                            }

                            var tV = shape.m_vertices[0];
                            var xy = adjust(tV.x, tV.y);
                            var pathStr = 'M' + xy[0] + ' ' + xy[1] + ' ';
                            for (var i = 1; i < shape.m_vertexCount; i++) {
                                var v = shape.m_vertices[i];
                                var xyInner = adjust(v.x, v.y);
                                pathStr += 'L' + xyInner[0] + ' ' + xyInner[1] + ' ';
                            }
                            pathStr += 'L' + xy[0] + ' ' + xy[1] + ' ';
                            shape.sprite = ctx.group();
                            parentBody.shape.remove();
                            parentBody.shape = shape.sprite;
                            var pathObj = shape.sprite.path(pathStr).attr({
                                'class': 'poly'
                            })
                            angle *= 180 / Math.PI; // convert to degrees from radians
                            var transform = new Snap.Matrix()
                            transform.translate(pos.x, pos.y);
                            transform.rotate(angle);
                            shape.sprite.transform(transform);
                        }
                        break;
                }
            }
            update();
        },
        createGround: function() {
            var groundSd = new b2BoxDef();
                groundSd.extents.Set(1200, 50);
                groundSd.restitution = 0.5;
                groundSd.friction = 0.3;
            var groundBd = new b2BodyDef();
                groundBd.AddShape(groundSd);
                groundBd.position.Set(-600, 440);
            return this.world.CreateBody(groundBd);
        },
        addPoly: function(shape) {
            var points = shape.attr("points").split(',');
            points = points.map(function(point) {
                return parseInt(point, 10);
            });
            var x = points[0];
            var y = points[1];
            var ar = [];
            for(i = 0; i < points.length; i +=2) {
                ar.push([points[i] - x, points[i+1] - y])
            }
            points = ar;
            var polySd = new b2PolyDef();
                polySd.restitution = shape.physics.restitution;
                polySd.friction = shape.physics.friction;
                if (!shape.physics.fixed) {
                    polySd.density = shape.physics.density;
                }
                polySd.vertexCount = points.length;
                for (var i = 0; i < points.length; i++) {
                    polySd.vertices[i].Set(points[i][0], points[i][1]);
                }
            var polyBd = new b2BodyDef();
                polyBd.AddShape(polySd);
                polyBd.position.Set(x, y);
            var body = this.world.CreateBody(polyBd);
                body.shape = shape;
            return body;
        },
        addCircle: function(shape) {
            var x = parseInt(shape.attr("cx"), 10);
            var y = parseInt(shape.attr("cy"), 10);
            var radius = parseInt(shape.attr("r"), 10);
            var width = parseInt(shape.attr("width"), 10);

            var ballSd = new b2CircleDef();
                ballSd.restitution = shape.physics.restitution;
                ballSd.friction = shape.physics.friction;
                if (!shape.physics.fixed) {
                    ballSd.density = shape.physics.density;
                }
                ballSd.radius = radius || 8;
            var ballBd = new b2BodyDef();
                ballBd.AddShape(ballSd);
                ballBd.position.Set(x, y);
            var body = this.world.CreateBody(ballBd);
                body.shape = shape;
            return body;
        },
        addBox: function(shape) {
            var x = parseInt(shape.attr("x"), 10);
            var y = parseInt(shape.attr("y"), 10);
            var width = parseInt(shape.attr("width"), 10);
            var height = parseInt(shape.attr("height"), 10);

            var boxSd = new b2BoxDef();
                boxSd.restitution = shape.physics.restitution;
                boxSd.friction = shape.physics.friction;
            if (!shape.physics.fixed) {
                console.log("not fixed")
                boxSd.density = shape.physics.density;
            }
                boxSd.extents.Set(width, height);
            var boxBd = new b2BodyDef();
                boxBd.AddShape(boxSd);
                boxBd.position.Set(x, y);
            var body = this.world.CreateBody(boxBd);
                body.shape = shape;
                return body;
        },
        addFixture: function(shape) {
            switch(shape.type) {
                case "circle":
                    return this.addCircle(shape);
                break;
                case "rect":
                    return this.addBox(shape);
                    break;
                case "polygon":
                    return this.addPoly(shape);
                    break;
            }
        }
    }
    Element.prototype.physics = function (properties) {
        this.physics = properties;
        return this;
    };
});