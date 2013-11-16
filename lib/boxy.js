Snap.plugin(function (Snap, Element, Paper, glob) {
    var elproto = Element.prototype;
    var paproto = Paper.prototype;
    var $ = Snap._.$;

    var defaults = {
        step: 1.0/60.0,
        velocityIterations: 8,
        positionIterations: 3,
        doSleep: true
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
    var World2D = function() {
        var worldAABB = new b2AABB();
            worldAABB.minVertex.Set(-1000, -1000);
            worldAABB.maxVertex.Set(10000, 1000);
        var gravity = new b2Vec2(0, 500);
        var doSleep = true;
            this.world = new b2World(worldAABB, gravity, doSleep);
    }
    World2D.prototype.circle = function(x, y, radius, physics, shape) {
        var ballSd = new b2CircleDef();
            ballSd.restitution = physics.restitution;
            ballSd.friction = physics.friction;
            if (!physics.fixed) {
                ballSd.density = physics.density;
            }
            ballSd.radius = radius || 8;
        var ballBd = new b2BodyDef();
            ballBd.AddShape(ballSd);
            ballBd.position.Set(x, y);
        var body = this.world.CreateBody(ballBd);
            body.shape = shape;
        return body;
    };
    World2D.prototype.rect = function(x, y, width, height, physics, shape) {
        var boxSd = new b2BoxDef();
            boxSd.restitution = physics.restitution;
            boxSd.friction = physics.friction;
        if (!physics.fixed) {
            boxSd.density = physics.density;
        }
            boxSd.extents.Set(width, height);
        var boxBd = new b2BodyDef();
            boxBd.AddShape(boxSd);
            boxBd.position.Set(x, y);
        var body = this.world.CreateBody(boxBd);
            body.shape = shape;
            return body;
    };
    World2D.prototype.polygon = function(x, y, points, physics, shape) {
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
        }
    World2D.prototype.addFixture = function(shape) {
        switch(shape.type) {
            case "circle":
                var x = parseInt(shape.attr("cx"), 10);
                var y = parseInt(shape.attr("cy"), 10);
                var radius = parseInt(shape.attr("r"), 10);
                return this.circle(x, y, radius, shape.physics, shape);
                break;
            case "rect":
                var x = parseInt(shape.attr("x"), 10);
                var y = parseInt(shape.attr("y"), 10);
                var width = parseInt(shape.attr("width"), 10);
                var height = parseInt(shape.attr("height"), 10);
                return this.rect(x, y, width, height, shape.physics, shape);
                break;
            case "polygon":
                var points = shape.attr("points").split(',');
                points = points.map(function(point) {
                    return parseInt(point, 10);
                });
                var x = points[0];
                var y = points[1];
                var pts = [];
                for(i = 0; i < points.length; i +=2) {
                    pts.push([points[i] - x, points[i+1] - y])
                }
                points = pts;
                return this.polygon(x, y, points, shape.physics, shape);
        }
    };
    World2D.prototype.run = function() {
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
                for (var joint = that.world.m_jointList; joint; joint = joint.m_next) {
                    //console.log(joint);
                    drawJoint(joint);
                }
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
            };
            function drawJoint(joint) {
                var b1 = joint.m_body1;
                var b2 = joint.m_body2;
                switch (joint.m_type) {
                    case b2Joint.e_distanceJoint:
                        var p1 = joint.GetAnchor1();
                        var p2 = joint.GetAnchor2();
                        /*if (joint.sprite) {
                            context.change(context.getElementById(joint.spriteId), {
                                'x1': p1.x,
                                'y1': p1.y,
                                'x2': p2.x,
                                'y2': p2.y
                            });
                        } else {
                            joint.sprite = context.group();
                            joint.spriteId = 'joint' + (uniqueJointId++);
                            context.line(joint.sprite, p1.x, p1.y, p2.x, p2.y, {
                                stroke: '#9f9',
                                fillOpacity: '0',
                                id: joint.spriteId
                            });
                        }*/
                        break;
                    case b2Joint.e_springJoint:
                    case b2Joint.e_pulleyJoint:
                        // TODO
                        break;
                    default:
                        if (joint.sprite) {
                            if (b1 == world.m_groundBody) {
                                var p1 = joint.GetAnchor1();
                                var x2 = b2.m_position;
                                /*context.change(context.getElementById(joint.spriteId), {
                                    'x1': p1.x,
                                    'y1': p1.y,
                                    'x2': x2.x,
                                    'y2': x2.y
                                });*/
                            }
                        } else {
                            var x1 = b1.m_position;
                            var x2 = b2.m_position;
                            var p1 = joint.GetAnchor1();
                            /*joint.sprite = context.group();
                            if (b1 == world.m_groundBody) {
                                joint.spriteId = 'joint' + (uniqueJointId++);
                                context.line(joint.sprite, p1.x, p1.y, x2.x, x2.y, {
                                    stroke: '#f99',
                                    'id': joint.spriteId
                                });
                            } else if (b2 == world.m_groundBody) {
                                context.line(joint.sprite, p1.x, p1.y, x1.x, x1.y, {
                                    stroke: 'blue'
                                });
                            } else {
                                var p2 = joint.GetAnchor2();
                                context.line(joint.sprite, x1.x, x1.y, p1.x, p1.y, {
                                    strokeWidth: '2px',
                                    stroke: '#9bb',
                                    fillOpacity: '0'
                                });
                                context.line(joint.sprite, p1.x, p1.y, x2.x, x2.y, {
                                    strokeWidth: '2px',
                                    stroke: '#9bb',
                                    fillOpacity: '0'
                                });
                                context.line(joint.sprite, x2.x, x2.y, p2.x, p2.y, {
                                    strokeWidth: '2px',
                                    stroke: '#9bb',
                                    fillOpacity: '0'
                                });
                            }*/
                        }
                        break;
                    }
            }
            update();
        };
    Paper.prototype.world2d = {
        world: null,
        create: function(options) {
            var worldAABB = new b2AABB();
                worldAABB.minVertex.Set(-1000, -1000);
                worldAABB.maxVertex.Set(10000, 1000);
            var gravity = new b2Vec2(0, 500);
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
                for (var joint = that.world.m_jointList; joint; joint = joint.m_next) {
                    //console.log(joint);
                    drawJoint(joint);
                }
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
            function drawJoint(joint) {
                var b1 = joint.m_body1;
                var b2 = joint.m_body2;
                switch (joint.m_type) {
                    case b2Joint.e_distanceJoint:
                        var p1 = joint.GetAnchor1();
                        var p2 = joint.GetAnchor2();
                        /*
                        if (joint.sprite) {
                            context.change(context.getElementById(joint.spriteId), {
                                'x1': p1.x,
                                'y1': p1.y,
                                'x2': p2.x,
                                'y2': p2.y
                            });
                        } else {
                            joint.sprite = context.group();
                            joint.spriteId = 'joint' + (uniqueJointId++);
                            context.line(joint.sprite, p1.x, p1.y, p2.x, p2.y, {
                                stroke: '#9f9',
                                fillOpacity: '0',
                                id: joint.spriteId
                            });
                        }
                        */
                        break;
                    case b2Joint.e_springJoint:
                    case b2Joint.e_pulleyJoint:
                        // TODO
                        break;
                    default:
                        if (joint.sprite) {
                            if (b1 == world.m_groundBody) {
                                var p1 = joint.GetAnchor1();
                                var x2 = b2.m_position;
                                /*
                                context.change(context.getElementById(joint.spriteId), {
                                    'x1': p1.x,
                                    'y1': p1.y,
                                    'x2': x2.x,
                                    'y2': x2.y
                                });
                                */
                            }
                        } else {
                            var x1 = b1.m_position;
                            var x2 = b2.m_position;
                            var p1 = joint.GetAnchor1();
                            /*
                            joint.sprite = context.group();
                            if (b1 == world.m_groundBody) {
                                joint.spriteId = 'joint' + (uniqueJointId++);
                                context.line(joint.sprite, p1.x, p1.y, x2.x, x2.y, {
                                    stroke: '#f99',
                                    'id': joint.spriteId
                                });
                            } else if (b2 == world.m_groundBody) {
                                context.line(joint.sprite, p1.x, p1.y, x1.x, x1.y, {
                                    stroke: 'blue'
                                });
                            } else {
                                var p2 = joint.GetAnchor2();
                                context.line(joint.sprite, x1.x, x1.y, p1.x, p1.y, {
                                    strokeWidth: '2px',
                                    stroke: '#9bb',
                                    fillOpacity: '0'
                                });
                                context.line(joint.sprite, p1.x, p1.y, x2.x, x2.y, {
                                    strokeWidth: '2px',
                                    stroke: '#9bb',
                                    fillOpacity: '0'
                                });
                                context.line(joint.sprite, x2.x, x2.y, p2.x, p2.y, {
                                    strokeWidth: '2px',
                                    stroke: '#9bb',
                                    fillOpacity: '0'
                                });
                            }
                            */
                        }
                        break;
                    }
            }
            update();
        },
        addPolygon: function(shape) {
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
                    return this.addPolygon(shape);
                    break;
            }
        }
    }
    Element.prototype.physics = function (properties) {
        this.physics = properties;
        return this;
    };
    Paper.prototype.createWorld = function (properties) {
        this.World2D = new World2D();
        console.log("breato world: ", this.node);
        return this.World2D;
    }
});