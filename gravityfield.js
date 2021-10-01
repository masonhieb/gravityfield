// A cool interactive background effect designed by Mason BD Hieb
// Copyright 2021 Mason BD Hieb
// masonhieb.com

function gravityfieldMain(radius=2) {
	const gravityfield = document.getElementById('gravityfield');
	const gf_ctx = gravityfield.getContext('2d');
	const mousePos = {
		x: 0,
		y: 0
	}
    
    const dotSep = 70; // distance (in pixels) between each dot
    const cardinalRadius = 8; // Radius that the cardinal spline is built into
    const gravityMultiplier = 15; // increase global strength of gravity
    const fixedPosMass = 3;
    const gfDotMass = 1;
    const mouseMass = 20;
    const colorizeAttracted = true;
    const drawLines = false;
    const colorVec = colorVecGenerate(80, 80, 80, 0 ,6, 120, 0, 0.6);
    const debugMode = false;
	
    setupScreen = () => {
        allDots = [];
        gravityfield.width = window.innerWidth;
        gravityfield.height = window.innerHeight;
        // allDots.push(new gfDot(gravityfield.width/2,gravityfield.height/2));
        const margin = dotSep*2;
        const width = margin+document.body.clientWidth;
        const height = margin+document.body.clientHeight;
        let hx = -margin;
        let hy = -margin;
        
        while (hx <= width) {
            hy = -margin;
            let isFirst = true;
            while (hy <= height) {
               allDots.push(new gfDot(hx,hy,radius,!isFirst,(isFirst ? null : allDots[allDots.length-1])));
               hy+=dotSep;
               isFirst = false;
            }
            hx+=dotSep;
        }
        return allDots
    }
    
    var allDots = setupScreen();
    
    function unit_vector(x1,y1,x2,y2) {
        
        const magnitude = dist(x1,y1,x2,y2);
        
        return {
            magnitude: magnitude,
            x: (x2-x1)/magnitude,
            y: (y2-y1)/magnitude
        }
    }
    
    function calcGravity(m1,m2,r,forMouse) {
        // A modified gravity equation to remote erratic behavior
        // and to prevent the mouse from having too much influence
        let denom;
        if (r < 1) {
            denom = Math.pow(r,2);
        } else if (forMouse) {
            denom = r;
        } else {
            denom = Math.sqrt(r);
        }
        const out = ((m1*m2)/denom)*gravityMultiplier;
        if (out > 100) {
            return 0;
        }
        return out
    }
    
    function calcGravityForceVector(x1,y1,x2,y2,m1,m2,forMouse) {
        const uv = unit_vector(x1,y1,x2,y2);
        
        if (uv.magnitude == 0) {
            return {
                x:0,
                y:0
            }
        } else {
            const g = calcGravity(m1,m2,uv.magnitude,forMouse);
            return {
                x:g*uv.x,
                y:g*uv.y
            }
        
        }
    }
    
    const minPullDistance = 10;
    
    const magmult = minPullDistance/window.innerWidth;
    
    setupGravityField();
	updateGravityField();
    
    function pointInCircle(xIn,yIn,radius,t) {
        return {
            x:xIn+(radius*Math.cos(t)),
            y:yIn+(radius*Math.sin(t))
        }
    }
    
    function randomCardinalSpline(bx,by,x,y) {
        // https://www.cubic.org/docs/hermite.htm
        const init_t = 0.1;
        this.t = 0;
        this.tvel = 1/(100+Math.random()*200);
        const a = 0.5;
        this.p0x = x;
        this.p0y = y;
        // let pmc = pointInCircle(bx,by,Math.random()*cardinalRadius*5,Math.random()*2*Math.PI);
        // this.t0x = pmc.x;
        // this.t0y = pmc.y;
        this.t0x = init_t;
        this.t0y = init_t;
        let pmc = pointInCircle(bx,by,Math.random()*cardinalRadius,Math.random()*2*Math.PI);
        this.p1x = pmc.x;
        this.p1y = pmc.y;
        // pmc = pointInCircle(bx,by,Math.random()*cardinalRadius*5,Math.random()*2*Math.PI);
        // this.t1x = pmc.x;
        // this.t1y = pmc.y;
        this.t1x = init_t;
        this.t1y = init_t;
        this.last_p = {x:0,y:0};
        
        this.pos = () => {
            if (this.t > 1) {
                this.t = 0;
                this.t0x = a*(this.p1x - this.p0x);
                this.t0y = a*(this.p1y - this.p0y);
                old_p1x = this.p1x;
                old_p1y = this.p1y;
                pmc = pointInCircle(bx,by,Math.random()*cardinalRadius,Math.random()*2*Math.PI);
                this.p1x = pmc.x;
                this.p1y = pmc.y;
                this.t1x = a*(this.p1x - old_p1x);
                this.t1y = a*(this.p1y - old_p1y);
                this.p0x = this.last_p.x;
                this.p0y = this.last_p.y;
            }
            
            const t2 = Math.pow(this.t,2);
            const t3 = Math.pow(this.t,3);
            const h1 = (2*t3)-(3*t2)+1;
            const h2 = (t3)-(2*t2)+this.t;
            const h3 = (-2*t3)+(3*t2);
            const h4 = t3-t2;
            
            // console.log('t2',t2,'t3',t3,'h1',h1,'h2',h2,'h3',h3,'h4',h4,this);
            this.t+=this.tvel;
            
            this.last_p = {
                x:(h1*this.p0x)+(h2*this.t0x)+(h3*this.p1x)+(h4*this.t1x),
                y:(h1*this.p0y)+(h2*this.t0y)+(h3*this.p1y)+(h4*this.t1y)
            }
            
            return this.last_p;


            
            
        }
    }
    
    function colorFromForce(t,colorVec,base_opacity) {
        let r = colorVec.rb+(colorVec.rv*t);
        let g = colorVec.gb+(colorVec.gv*t);
        let b = colorVec.bb+(colorVec.bv*t);
        let o = colorVec.ob+(colorVec.ov*t);
        
        if (r > 255) {
            r = 255;
        }
        
        if (g > 255) {
            g = 255;
        }
        
        if (b > 255) {
            b = 255;
        }
        
        if (o > 1) {
            o = 1;
        }
        
        if (r < 0) {
            r = 0;
        }
        
        if (g < 0) {
            g = 0;
        }
        
        if (b < 0) {
            b = 0;
        }
        
        if (o < 0) {
            o = 0;
        }
        
        return "rgba("+r+", "+g+", "+b+", " + (base_opacity+o) + ")";
        
    }
        
    function colorVecGenerate(c1r,c1g,c1b,c1o,c2r,c2g,c2b,c2o) {
        // Creates a vector in RGB space for easy interpolation
        return {
            rb:c1r,
            gb:c1g,
            bb:c1b,
            ob:c1o,
            rv: c2r-c1r,
            gv: c2g-c1g,
            bv: c2b-c1b,
            ov: c2o-c1o
        }
    }
    
    // let test_hc = new randomHermiteCurve(0,0,5,5);
    
    // console.log(test_hc.pos(0));

	function gfDot(x,y,radius,hasAbove,aboveDot) {

        this.fpx = x; // fixed position, doesn't move, this is what the base moves around
        this.fpy = y;
		this.bx = x; // base position, has gravitational pull
		this.by = y;
        this.x = x+10+Math.random()*(dotSep-10);
		this.y = y+10+Math.random()*(dotSep-10);
        this.radius = radius;
        this.hasAbove = hasAbove;
        this.aboveDot = aboveDot;
        this.path = new randomCardinalSpline(x,y,x,y);
        this.opacity = 0.25+(Math.random()*(colorizeAttracted ? 0.5 : 0.75));
        this.color = "rgba(100, 100, 100, " + this.opacity + ")";
        this.lastFrameTime = Date.now();
        this.singlerun = true;
        
		this.fx = 0; // force
        this.fy = 0;
        
        // for calculating average seconds to get the correct acceleration on each frame
        this.mCtr = 0;
        this.averageElapsedSeconds = 0;
        this.aesSum = 0;
        // x and y == bx and by, until mouse reaches minPullDistance. Once that value is reached, dot moves towards mouse, with a 
		
		this.vx = 0; // velocity
		this.vy = 0;
        
        this.pd = 0;
        
        this.calcForce = () => {
            const gFp = calcGravityForceVector(this.x,this.y,this.bx,this.by,gfDotMass,fixedPosMass,false);
            this.fx = gFp.x;
            this.fy = gFp.y;
            const gMp = calcGravityForceVector(this.x,this.y,mousePos.x,mousePos.y,gfDotMass,mouseMass,true);
            this.fx += gMp.x;
            this.fy += gMp.y;
            if (colorizeAttracted) {
                const gmag = Math.sqrt(Math.pow(gMp.x,2)+Math.pow(gMp.y,2));
                this.color = colorFromForce(gmag/10,colorVec,this.opacity-0.4);
            }
        }
		
		this.move = () => {
            
            //if (!document.hidden && document.hasFocus) { // otherwise acceleration experiences an "integral windup moment" and everything explodes if you tab out, wait a while, and then tab back in

            if (this.mCtr < 10) { // get an average after so many cycles, and then use this from that point on, so that if user tabs out we don't get what you might call an "integral windup moment"
                const now = Date.now();
                const elapsedS = (now - this.lastFrameTime)/1000; // acceleration is per this time unit
                this.aesSum += elapsedS;
                this.lastFrameTime = now;
                this.mCtr++;
                this.averageElapsedSeconds = this.aesSum/this.mCtr;
            }
            
            this.calcForce();

            let ax = (this.fx/gfDotMass)*this.averageElapsedSeconds; // acceleration
            let ay = (this.fy/gfDotMass)*this.averageElapsedSeconds;
            
            const maxAcceleration = 0.07;
            const maxVelocity = 3;
            
            if (Math.abs(ax) > maxAcceleration) {
                ax = (ax > 0) ? maxAcceleration : -maxAcceleration;
            }
            
            if (Math.abs(ay) > maxAcceleration) {
                ay = (ay > 0) ? maxAcceleration : -maxAcceleration;
            }
            
            this.vx+=ax;
            this.vy+=ay;
            
            if (Math.abs(this.vx) > maxVelocity) {
                if (this.vx < 0) {
                    this.vx = -maxVelocity;
                } else {
                    this.vx = maxVelocity;
                }
            }
            
            if (Math.abs(this.vy) > maxVelocity) {
                if (this.vy < 0) {
                    this.vy = -maxVelocity;
                } else {
                    this.vy = maxVelocity;
                }
            }
            
            if (this.t >= 1) {
                this.t = 0;
                this.path = new randomCardinalSpline(this.fpx,this.fpy,this.x,this.y);
            } else {
                const p = this.path.pos();
                this.bx = p.x;
                this.by = p.y;
            }
            this.t += this.tvel;

            this.x += this.vx;
            this.y += this.vy;
            
            
            
            //}
            
		}
		
		this.show = () => {
            // gf_ctx.beginPath();
			// // gf_ctx.fillStyle = "rgba(255, 255, 255, " + opacity + ")";
			// gf_ctx.fillStyle = "limegreen";
			// gf_ctx.arc(this.fpx, this.fpy, 3, 0, Math.PI * 2);
			// gf_ctx.fill();
            
            if (debugMode) {
            
                // gf_ctx.beginPath();
                // gf_ctx.fillStyle = "limegreen";
                // gf_ctx.arc(this.path.p0x, this.path.p0y, 3, 0, Math.PI * 2);
                // gf_ctx.fill();
                
                
                // gf_ctx.beginPath();
                // gf_ctx.fillStyle = "green";
                // gf_ctx.arc(this.path.p1x, this.path.p1y, 3, 0, Math.PI * 2);
                // gf_ctx.fill();
                
                
                gf_ctx.beginPath();
                gf_ctx.fillStyle = "rgba(50, 160, 50, 0.25)";
                gf_ctx.arc(this.bx, this.by, 3, 0, Math.PI * 2);
                gf_ctx.fill();
            
            }
            
            if (drawLines && this.hasAbove) {
            
                gf_ctx.beginPath();
                gf_ctx.strokeStyle = "rgba(100, 100, 100, 0.25)";
                gf_ctx.moveTo(this.aboveDot.x, this.aboveDot.y);
                gf_ctx.lineTo(this.x, this.y);
                gf_ctx.stroke(); 
            
            }
            
			gf_ctx.beginPath();
			gf_ctx.fillStyle = this.color;
			gf_ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
			gf_ctx.fill();
		}
		
		
	}

	window.addEventListener('mousemove', e => {
		mousePos.x = e.clientX;
		mousePos.y = e.clientY;
	});
    
    window.addEventListener('drag', e => {
		mousePos.x = e.touches[0].clientX;
		mousePos.y = e.touches[0].clientY;
	});
	
	function setupGravityField() {
		window.cancelAnimationFrame(updateGravityField);
	}
	
	function updateGravityField() {
        const grad = gf_ctx.createRadialGradient(gravityfield.width/2, gravityfield.height/2, gravityfield.width/15, gravityfield.width/2, gravityfield.height/2, gravityfield.width/2);
        grad.addColorStop(0,"rgb(224, 224, 224)");
        grad.addColorStop(1,"rgb(120, 120, 120)");
		gf_ctx.fillStyle = grad;
		gf_ctx.fillRect(0, 0, gravityfield.width, gravityfield.height);
        allDots.forEach(e => {
            e.move();
            e.show();
        });
		window.requestAnimationFrame(updateGravityField);
	}

    /*
    function bezierCurve(bx,by,x,y) {
        const bezierRadius = divv;
        // random quadratic bezier curve, starts at x,y
        // and never leaves the circle of given radius
        this.p0x = x;
        this.p0y = y;
        let pmc = paramCircle(bx,by,cardinalRadius,Math.random()*2*Math.PI);
        this.p1x = pmc.xOut;
        this.p1y = pmc.yOut;
        pmc = paramCircle(bx,by,cardinalRadius,Math.random()*2*Math.PI);
        this.p2x = pmc.xOut;
        this.p2y = pmc.yOut;
        
        
        // gf_ctx.beginPath();
        // // gf_ctx.fillStyle = "rgba(255, 255, 255, " + opacity + ")";
        // gf_ctx.fillStyle = "darkgreen";
        // gf_ctx.arc(this.p1x, this.p1y, 8, 0, Math.PI * 2);
        // gf_ctx.fill();
        
        this.pos = (t) => {
            return {
                x:(1-t)*((1-t)*this.p0x+t*this.p1x)+t*((1-t)*this.p1x+t*this.p2x),
                y:(1-t)*((1-t)*this.p0y+t*this.p1y)+t*((1-t)*this.p1y+t*this.p2y),
            }
        }
        
    }
    this.setDvec = () => {
        const magnitude = dist(this.fpx,this.fpy,mousePos.x,mousePos.y);
        
        this.dvx = (mousePos.x - this.fpx)/magnitude;
        this.dvy = (mousePos.y - this.fpy)/magnitude;
        
        if (magnitude > minPullDistance) {
            this.dvx+=magmult*(magnitude);
            this.dvy+=magmult*(magnitude);
        } else {
            this.dvx = 0;
            this.dvy = 0;
        }
    }
    */
}
