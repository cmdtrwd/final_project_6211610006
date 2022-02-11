$(window).on("load", function () {
    $("#loader-box").fadeOut("slow");
});





// Utilities
var Vector3 = {};
var Matrix44 = {};
Vector3.create = function(x, y, z) {
    return {'x':x, 'y':y, 'z':z};
};
Vector3.dot = function (v0, v1) {
    return v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
};
Vector3.cross = function (v, v0, v1) {
    v.x = v0.y * v1.z - v0.z * v1.y;
    v.y = v0.z * v1.x - v0.x * v1.z;
    v.z = v0.x * v1.y - v0.y * v1.x;
};
Vector3.normalize = function (v) {
    var l = v.x * v.x + v.y * v.y + v.z * v.z;
    if(l > 0.00001) {
        l = 1.0 / Math.sqrt(l);
        v.x *= l;
        v.y *= l;
        v.z *= l;
    }
};
Vector3.arrayForm = function(v) {
    if(v.array) {
        v.array[0] = v.x;
        v.array[1] = v.y;
        v.array[2] = v.z;
    }
    else {
        v.array = new Float32Array([v.x, v.y, v.z]);
    }
    return v.array;
};
Matrix44.createIdentity = function () {
    return new Float32Array([1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]);
};
Matrix44.loadProjection = function (m, aspect, vdeg, near, far) {
    var h = near * Math.tan(vdeg * Math.PI / 180.0 * 0.5) * 2.0;
    var w = h * aspect;
    
    m[0] = 2.0 * near / w;
    m[1] = 0.0;
    m[2] = 0.0;
    m[3] = 0.0;
    
    m[4] = 0.0;
    m[5] = 2.0 * near / h;
    m[6] = 0.0;
    m[7] = 0.0;
    
    m[8] = 0.0;
    m[9] = 0.0;
    m[10] = -(far + near) / (far - near);
    m[11] = -1.0;
    
    m[12] = 0.0;
    m[13] = 0.0;
    m[14] = -2.0 * far * near / (far - near);
    m[15] = 0.0;
};
Matrix44.loadLookAt = function (m, vpos, vlook, vup) {
    var frontv = Vector3.create(vpos.x - vlook.x, vpos.y - vlook.y, vpos.z - vlook.z);
    Vector3.normalize(frontv);
    var sidev = Vector3.create(1.0, 0.0, 0.0);
    Vector3.cross(sidev, vup, frontv);
    Vector3.normalize(sidev);
    var topv = Vector3.create(1.0, 0.0, 0.0);
    Vector3.cross(topv, frontv, sidev);
    Vector3.normalize(topv);
    
    m[0] = sidev.x;
    m[1] = topv.x;
    m[2] = frontv.x;
    m[3] = 0.0;
    
    m[4] = sidev.y;
    m[5] = topv.y;
    m[6] = frontv.y;
    m[7] = 0.0;
    
    m[8] = sidev.z;
    m[9] = topv.z;
    m[10] = frontv.z;
    m[11] = 0.0;
    
    m[12] = -(vpos.x * m[0] + vpos.y * m[4] + vpos.z * m[8]);
    m[13] = -(vpos.x * m[1] + vpos.y * m[5] + vpos.z * m[9]);
    m[14] = -(vpos.x * m[2] + vpos.y * m[6] + vpos.z * m[10]);
    m[15] = 1.0;
};

//
var timeInfo = {
    'start':0, 'prev':0, // Date
    'delta':0, 'elapsed':0 // Number(sec)
};

//
var gl;
var renderSpec = {
    'width':0,
    'height':0,
    'aspect':1,
    'array':new Float32Array(3),
    'halfWidth':0,
    'halfHeight':0,
    'halfArray':new Float32Array(3)
    // and some render targets. see setViewport()
};
renderSpec.setSize = function(w, h) {
    renderSpec.width = w;
    renderSpec.height = h;
    renderSpec.aspect = renderSpec.width / renderSpec.height;
    renderSpec.array[0] = renderSpec.width;
    renderSpec.array[1] = renderSpec.height;
    renderSpec.array[2] = renderSpec.aspect;
    
    renderSpec.halfWidth = Math.floor(w / 2);
    renderSpec.halfHeight = Math.floor(h / 2);
    renderSpec.halfArray[0] = renderSpec.halfWidth;
    renderSpec.halfArray[1] = renderSpec.halfHeight;
    renderSpec.halfArray[2] = renderSpec.halfWidth / renderSpec.halfHeight;
};

function deleteRenderTarget(rt) {
    gl.deleteFramebuffer(rt.frameBuffer);
    gl.deleteRenderbuffer(rt.renderBuffer);
    gl.deleteTexture(rt.texture);
}

function createRenderTarget(w, h) {
    var ret = {
        'width':w,
        'height':h,
        'sizeArray':new Float32Array([w, h, w / h]),
        'dtxArray':new Float32Array([1.0 / w, 1.0 / h])
    };
    ret.frameBuffer = gl.createFramebuffer();
    ret.renderBuffer = gl.createRenderbuffer();
    ret.texture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, ret.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, ret.frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ret.texture, 0);
    
    gl.bindRenderbuffer(gl.RENDERBUFFER, ret.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, ret.renderBuffer);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    return ret;
}

function compileShader(shtype, shsrc) {
	var retsh = gl.createShader(shtype);
	
	gl.shaderSource(retsh, shsrc);
	gl.compileShader(retsh);
	
	if(!gl.getShaderParameter(retsh, gl.COMPILE_STATUS)) {
		var errlog = gl.getShaderInfoLog(retsh);
		gl.deleteShader(retsh);
		console.error(errlog);
		return null;
	}
	return retsh;
}

function createShader(vtxsrc, frgsrc, uniformlist, attrlist) {
    var vsh = compileShader(gl.VERTEX_SHADER, vtxsrc);
    var fsh = compileShader(gl.FRAGMENT_SHADER, frgsrc);
    
    if(vsh == null || fsh == null) {
        return null;
    }
    
    var prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    
    gl.deleteShader(vsh);
    gl.deleteShader(fsh);
    
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        var errlog = gl.getProgramInfoLog(prog);
        console.error(errlog);
        return null;
    }
    
    if(uniformlist) {
        prog.uniforms = {};
        for(var i = 0; i < uniformlist.length; i++) {
            prog.uniforms[uniformlist[i]] = gl.getUniformLocation(prog, uniformlist[i]);
        }
    }
    
    if(attrlist) {
        prog.attributes = {};
        for(var i = 0; i < attrlist.length; i++) {
            var attr = attrlist[i];
            prog.attributes[attr] = gl.getAttribLocation(prog, attr);
        }
    }
    
    return prog;
}

function useShader(prog) {
    gl.useProgram(prog);
    for(var attr in prog.attributes) {
        gl.enableVertexAttribArray(prog.attributes[attr]);;
    }
}

function unuseShader(prog) {
    for(var attr in prog.attributes) {
        gl.disableVertexAttribArray(prog.attributes[attr]);;
    }
    gl.useProgram(null);
}

/////
var projection = {
    'angle':60,
    'nearfar':new Float32Array([0.1, 100.0]),
    'matrix':Matrix44.createIdentity()
};
var camera = {
    'position':Vector3.create(0, 0, 100),
    'lookat':Vector3.create(0, 0, 0),
    'up':Vector3.create(0, 1, 0),
    'dof':Vector3.create(10.0, 4.0, 8.0),
    'matrix':Matrix44.createIdentity()
};

var pointFlower = {};
var meshFlower = {};
var sceneStandBy = false;

var BlossomParticle = function () {
    this.velocity = new Array(3);
    this.rotation = new Array(3);
    this.position = new Array(3);
    this.euler = new Array(3);
    this.size = 1.0;
    this.alpha = 1.0;
    this.zkey = 0.0;
};

BlossomParticle.prototype.setVelocity = function (vx, vy, vz) {
    this.velocity[0] = vx;
    this.velocity[1] = vy;
    this.velocity[2] = vz;
};

BlossomParticle.prototype.setRotation = function (rx, ry, rz) {
    this.rotation[0] = rx;
    this.rotation[1] = ry;
    this.rotation[2] = rz;
};

BlossomParticle.prototype.setPosition = function (nx, ny, nz) {
    this.position[0] = nx;
    this.position[1] = ny;
    this.position[2] = nz;
};

BlossomParticle.prototype.setEulerAngles = function (rx, ry, rz) {
    this.euler[0] = rx;
    this.euler[1] = ry;
    this.euler[2] = rz;
};

BlossomParticle.prototype.setSize = function (s) {
    this.size = s;
};

BlossomParticle.prototype.update = function (dt, et) {
    this.position[0] += this.velocity[0] * dt;
    this.position[1] += this.velocity[1] * dt;
    this.position[2] += this.velocity[2] * dt;
    
    this.euler[0] += this.rotation[0] * dt;
    this.euler[1] += this.rotation[1] * dt;
    this.euler[2] += this.rotation[2] * dt;
};

function createPointFlowers() {
    // get point sizes
    var prm = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    renderSpec.pointSize = {'min':prm[0], 'max':prm[1]};
    
    var vtxsrc = document.getElementById("sakura_point_vsh").textContent;
    var frgsrc = document.getElementById("sakura_point_fsh").textContent;
    
    pointFlower.program = createShader(
        vtxsrc, frgsrc,
        ['uProjection', 'uModelview', 'uResolution', 'uOffset', 'uDOF', 'uFade'],
        ['aPosition', 'aEuler', 'aMisc']
    );
    
    useShader(pointFlower.program);
    pointFlower.offset = new Float32Array([0.0, 0.0, 0.0]);
    pointFlower.fader = Vector3.create(0.0, 10.0, 0.0);
    
    // paramerters: velocity[3], rotate[3]
    pointFlower.numFlowers = 1600;
    pointFlower.particles = new Array(pointFlower.numFlowers);
    // vertex attributes {position[3], euler_xyz[3], size[1]}
    pointFlower.dataArray = new Float32Array(pointFlower.numFlowers * (3 + 3 + 2));
    pointFlower.positionArrayOffset = 0;
    pointFlower.eulerArrayOffset = pointFlower.numFlowers * 3;
    pointFlower.miscArrayOffset = pointFlower.numFlowers * 6;
    
    pointFlower.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    unuseShader(pointFlower.program);
    
    for(var i = 0; i < pointFlower.numFlowers; i++) {
        pointFlower.particles[i] = new BlossomParticle();
    }
}

function initPointFlowers() {
    //area
    pointFlower.area = Vector3.create(20.0, 20.0, 20.0);
    pointFlower.area.x = pointFlower.area.y * renderSpec.aspect;
    
    pointFlower.fader.x = 10.0; //env fade start
    pointFlower.fader.y = pointFlower.area.z; //env fade half
    pointFlower.fader.z = 0.1;  //near fade start
    
    //particles
    var PI2 = Math.PI * 2.0;
    var tmpv3 = Vector3.create(0, 0, 0);
    var tmpv = 0;
    var symmetryrand = function() {return (Math.random() * 2.0 - 1.0);};
    for(var i = 0; i < pointFlower.numFlowers; i++) {
        var tmpprtcl = pointFlower.particles[i];
        
        //velocity
        tmpv3.x = symmetryrand() * 0.3 + 0.8;
        tmpv3.y = symmetryrand() * 0.2 - 1.0;
        tmpv3.z = symmetryrand() * 0.3 + 0.5;
        Vector3.normalize(tmpv3);
        tmpv = 2.0 + Math.random() * 1.0;
        tmpprtcl.setVelocity(tmpv3.x * tmpv, tmpv3.y * tmpv, tmpv3.z * tmpv);
        
        //rotation
        tmpprtcl.setRotation(
            symmetryrand() * PI2 * 0.5,
            symmetryrand() * PI2 * 0.5,
            symmetryrand() * PI2 * 0.5
        );
        
        //position
        tmpprtcl.setPosition(
            symmetryrand() * pointFlower.area.x,
            symmetryrand() * pointFlower.area.y,
            symmetryrand() * pointFlower.area.z
        );
        
        //euler
        tmpprtcl.setEulerAngles(
            Math.random() * Math.PI * 2.0,
            Math.random() * Math.PI * 2.0,
            Math.random() * Math.PI * 2.0
        );
        
        //size
        tmpprtcl.setSize(0.9 + Math.random() * 0.1);
    }
}

function renderPointFlowers() {
    //update
    var PI2 = Math.PI * 2.0;
    var limit = [pointFlower.area.x, pointFlower.area.y, pointFlower.area.z];
    var repeatPos = function (prt, cmp, limit) {
        if(Math.abs(prt.position[cmp]) - prt.size * 0.5 > limit) {
            //out of area
            if(prt.position[cmp] > 0) {
                prt.position[cmp] -= limit * 2.0;
            }
            else {
                prt.position[cmp] += limit * 2.0;
            }
        }
    };
    var repeatEuler = function (prt, cmp) {
        prt.euler[cmp] = prt.euler[cmp] % PI2;
        if(prt.euler[cmp] < 0.0) {
            prt.euler[cmp] += PI2;
        }
    };
    
    for(var i = 0; i < pointFlower.numFlowers; i++) {
        var prtcl = pointFlower.particles[i];
        prtcl.update(timeInfo.delta, timeInfo.elapsed);
        repeatPos(prtcl, 0, pointFlower.area.x);
        repeatPos(prtcl, 1, pointFlower.area.y);
        repeatPos(prtcl, 2, pointFlower.area.z);
        repeatEuler(prtcl, 0);
        repeatEuler(prtcl, 1);
        repeatEuler(prtcl, 2);
        
        prtcl.alpha = 1.0;//(pointFlower.area.z - prtcl.position[2]) * 0.5;
        
        prtcl.zkey = (camera.matrix[2] * prtcl.position[0]
                    + camera.matrix[6] * prtcl.position[1]
                    + camera.matrix[10] * prtcl.position[2]
                    + camera.matrix[14]);
    }
    
    // sort
    pointFlower.particles.sort(function(p0, p1){return p0.zkey - p1.zkey;});
    
    // update data
    var ipos = pointFlower.positionArrayOffset;
    var ieuler = pointFlower.eulerArrayOffset;
    var imisc = pointFlower.miscArrayOffset;
    for(var i = 0; i < pointFlower.numFlowers; i++) {
        var prtcl = pointFlower.particles[i];
        pointFlower.dataArray[ipos] = prtcl.position[0];
        pointFlower.dataArray[ipos + 1] = prtcl.position[1];
        pointFlower.dataArray[ipos + 2] = prtcl.position[2];
        ipos += 3;
        pointFlower.dataArray[ieuler] = prtcl.euler[0];
        pointFlower.dataArray[ieuler + 1] = prtcl.euler[1];
        pointFlower.dataArray[ieuler + 2] = prtcl.euler[2];
        ieuler += 3;
        pointFlower.dataArray[imisc] = prtcl.size;
        pointFlower.dataArray[imisc + 1] = prtcl.alpha;
        imisc += 2;
    }
    
    //draw
    gl.enable(gl.BLEND);
    //gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    var prog = pointFlower.program;
    useShader(prog);
    
    gl.uniformMatrix4fv(prog.uniforms.uProjection, false, projection.matrix);
    gl.uniformMatrix4fv(prog.uniforms.uModelview, false, camera.matrix);
    gl.uniform3fv(prog.uniforms.uResolution, renderSpec.array);
    gl.uniform3fv(prog.uniforms.uDOF, Vector3.arrayForm(camera.dof));
    gl.uniform3fv(prog.uniforms.uFade, Vector3.arrayForm(pointFlower.fader));
    
    gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW);
    
    gl.vertexAttribPointer(prog.attributes.aPosition, 3, gl.FLOAT, false, 0, pointFlower.positionArrayOffset * Float32Array.BYTES_PER_ELEMENT);
    gl.vertexAttribPointer(prog.attributes.aEuler, 3, gl.FLOAT, false, 0, pointFlower.eulerArrayOffset * Float32Array.BYTES_PER_ELEMENT);
    gl.vertexAttribPointer(prog.attributes.aMisc, 2, gl.FLOAT, false, 0, pointFlower.miscArrayOffset * Float32Array.BYTES_PER_ELEMENT);
    
    // doubler
    for(var i = 1; i < 2; i++) {
        var zpos = i * -2.0;
        pointFlower.offset[0] = pointFlower.area.x * -1.0;
        pointFlower.offset[1] = pointFlower.area.y * -1.0;
        pointFlower.offset[2] = pointFlower.area.z * zpos;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINT, 0, pointFlower.numFlowers);
        
        pointFlower.offset[0] = pointFlower.area.x * -1.0;
        pointFlower.offset[1] = pointFlower.area.y *  1.0;
        pointFlower.offset[2] = pointFlower.area.z * zpos;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINT, 0, pointFlower.numFlowers);
        
        pointFlower.offset[0] = pointFlower.area.x *  1.0;
        pointFlower.offset[1] = pointFlower.area.y * -1.0;
        pointFlower.offset[2] = pointFlower.area.z * zpos;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINT, 0, pointFlower.numFlowers);
        
        pointFlower.offset[0] = pointFlower.area.x *  1.0;
        pointFlower.offset[1] = pointFlower.area.y *  1.0;
        pointFlower.offset[2] = pointFlower.area.z * zpos;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINT, 0, pointFlower.numFlowers);
    }
    
    //main
    pointFlower.offset[0] = 0.0;
    pointFlower.offset[1] = 0.0;
    pointFlower.offset[2] = 0.0;
    gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
    gl.drawArrays(gl.POINT, 0, pointFlower.numFlowers);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    unuseShader(prog);
    
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
}

// effects
//common util
function createEffectProgram(vtxsrc, frgsrc, exunifs, exattrs) {
    var ret = {};
    var unifs = ['uResolution', 'uSrc', 'uDelta'];
    if(exunifs) {
        unifs = unifs.concat(exunifs);
    }
    var attrs = ['aPosition'];
    if(exattrs) {
        attrs = attrs.concat(exattrs);
    }
    
    ret.program = createShader(vtxsrc, frgsrc, unifs, attrs);
    useShader(ret.program);
    
    ret.dataArray = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ]);
    ret.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ret.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, ret.dataArray, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    unuseShader(ret.program);
    
    return ret;
}

// basic usage
// useEffect(prog, srctex({'texture':texid, 'dtxArray':(f32)[dtx, dty]})); //basic initialize
// gl.uniform**(...); //additional uniforms
// drawEffect()
// unuseEffect(prog)
// TEXTURE0 makes src
function useEffect(fxobj, srctex) {
    var prog = fxobj.program;
    useShader(prog);
    gl.uniform3fv(prog.uniforms.uResolution, renderSpec.array);
    
    if(srctex != null) {
        gl.uniform2fv(prog.uniforms.uDelta, srctex.dtxArray);
        gl.uniform1i(prog.uniforms.uSrc, 0);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, srctex.texture);
    }
}
function drawEffect(fxobj) {
    gl.bindBuffer(gl.ARRAY_BUFFER, fxobj.buffer);
    gl.vertexAttribPointer(fxobj.program.attributes.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function unuseEffect(fxobj) {
    unuseShader(fxobj.program);
}

var effectLib = {};
function createEffectLib() {
    
    var vtxsrc, frgsrc;
    //common
    var cmnvtxsrc = document.getElementById("fx_common_vsh").textContent;
    
    //background
    frgsrc = document.getElementById("bg_fsh").textContent;
    effectLib.sceneBg = createEffectProgram(cmnvtxsrc, frgsrc, ['uTimes'], null);
    
    // make brightpixels buffer
    frgsrc = document.getElementById("fx_brightbuf_fsh").textContent;
    effectLib.mkBrightBuf = createEffectProgram(cmnvtxsrc, frgsrc, null, null);
    
    // direction blur
    frgsrc = document.getElementById("fx_dirblur_r4_fsh").textContent;
    effectLib.dirBlur = createEffectProgram(cmnvtxsrc, frgsrc, ['uBlurDir'], null);
    
    //final composite
    vtxsrc = document.getElementById("pp_final_vsh").textContent;
    frgsrc = document.getElementById("pp_final_fsh").textContent;
    effectLib.finalComp = createEffectProgram(vtxsrc, frgsrc, ['uBloom'], null);
}

// background
function createBackground() {
    //console.log("create background");
}
function initBackground() {
    //console.log("init background");
}
function renderBackground() {
    gl.disable(gl.DEPTH_TEST);
    
    useEffect(effectLib.sceneBg, null);
    gl.uniform2f(effectLib.sceneBg.program.uniforms.uTimes, timeInfo.elapsed, timeInfo.delta);
    drawEffect(effectLib.sceneBg);
    unuseEffect(effectLib.sceneBg);
    
    gl.enable(gl.DEPTH_TEST);
}

// post process
var postProcess = {};
function createPostProcess() {
    //console.log("create post process");
}
function initPostProcess() {
    //console.log("init post process");
}

function renderPostProcess() {
    gl.enable(gl.TEXTURE_2D);
    gl.disable(gl.DEPTH_TEST);
    var bindRT = function (rt, isclear) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, rt.frameBuffer);
        gl.viewport(0, 0, rt.width, rt.height);
        if(isclear) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }
    };
    
    //make bright buff
    bindRT(renderSpec.wHalfRT0, true);
    useEffect(effectLib.mkBrightBuf, renderSpec.mainRT);
    drawEffect(effectLib.mkBrightBuf);
    unuseEffect(effectLib.mkBrightBuf);
    
    // make bloom
    for(var i = 0; i < 2; i++) {
        var p = 1.5 + 1 * i;
        var s = 2.0 + 1 * i;
        bindRT(renderSpec.wHalfRT1, true);
        useEffect(effectLib.dirBlur, renderSpec.wHalfRT0);
        gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir, p, 0.0, s, 0.0);
        drawEffect(effectLib.dirBlur);
        unuseEffect(effectLib.dirBlur);
        
        bindRT(renderSpec.wHalfRT0, true);
        useEffect(effectLib.dirBlur, renderSpec.wHalfRT1);
        gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir, 0.0, p, 0.0, s);
        drawEffect(effectLib.dirBlur);
        unuseEffect(effectLib.dirBlur);
    }
    
    //display
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, renderSpec.width, renderSpec.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    useEffect(effectLib.finalComp, renderSpec.mainRT);
    gl.uniform1i(effectLib.finalComp.program.uniforms.uBloom, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, renderSpec.wHalfRT0.texture);
    drawEffect(effectLib.finalComp);
    unuseEffect(effectLib.finalComp);
    
    gl.enable(gl.DEPTH_TEST);
}

/////
var SceneEnv = {};
function createScene() {
    createEffectLib();
    createBackground();
    createPointFlowers();
    createPostProcess();
    sceneStandBy = true;
}

function initScene() {
    initBackground();
    initPointFlowers();
    initPostProcess();
    
    //camera.position.z = 17.320508;
    camera.position.z = pointFlower.area.z + projection.nearfar[0];
    projection.angle = Math.atan2(pointFlower.area.y, camera.position.z + pointFlower.area.z) * 180.0 / Math.PI * 2.0;
    Matrix44.loadProjection(projection.matrix, renderSpec.aspect, projection.angle, projection.nearfar[0], projection.nearfar[1]);
}

function renderScene() {
    //draw
    Matrix44.loadLookAt(camera.matrix, camera.position, camera.lookat, camera.up);
    
    gl.enable(gl.DEPTH_TEST);
    
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderSpec.mainRT.frameBuffer);
    gl.viewport(0, 0, renderSpec.mainRT.width, renderSpec.mainRT.height);
    gl.clearColor(0.005, 0, 0.05, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    renderBackground();
    renderPointFlowers();
    renderPostProcess();
}

/////
function onResize(e) {
    makeCanvasFullScreen(document.getElementById("sakura"));
    setViewports();
    if(sceneStandBy) {
        initScene();
    }
}

function setViewports() {
    renderSpec.setSize(gl.canvas.width, gl.canvas.height);
    
    gl.clearColor(0.2, 0.2, 0.5, 1.0);
    gl.viewport(0, 0, renderSpec.width, renderSpec.height);
    
    var rtfunc = function (rtname, rtw, rth) {
        var rt = renderSpec[rtname];
        if(rt) deleteRenderTarget(rt);
        renderSpec[rtname] = createRenderTarget(rtw, rth);
    };
    rtfunc('mainRT', renderSpec.width, renderSpec.height);
    rtfunc('wFullRT0', renderSpec.width, renderSpec.height);
    rtfunc('wFullRT1', renderSpec.width, renderSpec.height);
    rtfunc('wHalfRT0', renderSpec.halfWidth, renderSpec.halfHeight);
    rtfunc('wHalfRT1', renderSpec.halfWidth, renderSpec.halfHeight);
}

function render() {
    renderScene();
}

var animating = true;
function toggleAnimation(elm) {
    animating ^= true;
    if(animating) animate();
    if(elm) {
        elm.innerHTML = animating? "Stop":"Start";
    }
}

function stepAnimation() {
    if(!animating) animate();
}

function animate() {
    var curdate = new Date();
    timeInfo.elapsed = (curdate - timeInfo.start) / 1000.0;
    timeInfo.delta = (curdate - timeInfo.prev) / 1000.0;
    timeInfo.prev = curdate;
    
    if(animating) requestAnimationFrame(animate);
    render();
}

function makeCanvasFullScreen(canvas) {
    var b = document.body;
	var d = document.documentElement;
	fullw = Math.max(b.clientWidth , b.scrollWidth, d.scrollWidth, d.clientWidth);
	fullh = Math.max(b.clientHeight , b.scrollHeight, d.scrollHeight, d.clientHeight);
	canvas.width = fullw;
	canvas.height = fullh;
}

window.addEventListener('load', function(e) {
    var canvas = document.getElementById("sakura");
    try {
        makeCanvasFullScreen(canvas);
        gl = canvas.getContext('experimental-webgl');
    } catch(e) {
        alert("WebGL not supported." + e);
        console.error(e);
        return;
    }
    
    window.addEventListener('resize', onResize);
    
    setViewports();
    createScene();
    initScene();
    
    timeInfo.start = new Date();
    timeInfo.prev = timeInfo.start;
    animate();
});

//set window.requestAnimationFrame
(function (w, r) {
    w['r'+r] = w['r'+r] || w['webkitR'+r] || w['mozR'+r] || w['msR'+r] || w['oR'+r] || function(c){ w.setTimeout(c, 1000 / 60); };
})(window, 'requestAnimationFrame');




//THIS CODE IS FOR SNOWFALL ANIMATION




$(document).ready(function() {

	 //Initialize our snowfall plugin on the canvas element
	 $("#snowfall").Snowfall();
});

(function($, window, document, undefined) {
	"use strict";

	//Constructor
	var Snowfall = function(elem, options) {
		this.element = elem;
		this.options = options;
	};

	//Prototype
	Snowfall.prototype = {

		//Configuration
		defaults:{
			//Sizing
			sizingMode: 'window',					//Either css (get pixel value from element css), parent (size canvas to parent size), explicit (use values below) or window (full screen canvas)
			width: $(window).height(),								//In case of sizingMode explicit: use this width for the canvas
			height: $(window).width(),							//In case of sizingMode explicit: use this height for the canvas	

			//Amount of particles
			amount: 140,								//Amount of particles that will be created

			//Positioning
			horizontalOffsetLeft:0,					//Horizontal offset from the left (can be positive or negative) in px, to shift starting point, useful when having diagonal snow
			horizontalOffsetRight:0,				//Horizontal offset from the right (can be positive or negative) in px, to shift starting point, useful when having diagonal snow
			verticalOffsetTop:0,					//Vertical offset from the top (can be positive or negative) in px, useful for the start position of the snow above the canvas

			//Vertical speed configuration
			verticalSpeed: 20,						//Somewhere between 0.5 and 10 works best
			randomVerticalSpeed: true,				//True or false
			minimumRandomVerticalSpeed: 1,			//Minimum shouldn't be lower than zero and probably heigher than 0.5
			maxiumumRandomVerticalSpeed: 5,			//Maxiumum shouln't be lower than zero and probably lower than 10

			//Horizontal speed configuration
			horizontalSpeed:0,						//Somewhere between -10 and 10 works best, negative values for left moving particles
			randomHorizontalSpeed: true,			//True or false
			minimumRandomHorizontalSpeed: 2,		//Minimum horizontal speed, can be negative for moving to the left.
			maxiumumRandomHorizontalSpeed:5,		//Maxiumum horizontal speed, can be negative for moving to the left.
			horizontalMirroring: true,				//When set to true, particles which go out of screen horizontally will emerge at the other side

			//Wind
			wind:true,								//Set to true to enable a basic wind element to the particles
			minimumWind:2,							//Minimum wind speed (can be negative)
			maximumWind:6,							//Maximun wind speed (can be negative)
			windPeriod:10,							//Period in which the wind comes full circle again and starts again

			//Graphics
			graphicMode: false,						//True or false, draws a circle when false
			radius: 4,								//In case graphicMode false: radius for drawn circles
			randomRadius: true,						//In case graphicMode false: toggle random radius for drawn circles
			minimumRandomRadius:1,					//In case graphicMode false: minimum random radius
			maxiumRandomRadius:5,					//In case graphicMode false: maximum random radius
			graphics: [	'http://upload.wikimedia.org/wikipedia/commons/b/bb/Snow_flake_icon.png'
			]										//In case graphicMode true: array of image urls to use
		},

		//Initialisation
		init: function() {
			//Get the options and merge with defaults
			this.config = $.extend({}, this.defaults, this.options);

			//Variables
			this.x = 0;

			//Get the context from our canvas element
			this.ctx = this.element.getContext('2d');

			//Check if we need to load images (we are in graphic mode)
			if(this.config.graphicMode){

				//Variables we need
				var loadedImages = 0, _self = this;
				this.graphics = [];

				//Loop through the urls in the config
				$.each(this.config.graphics,function(i,el){
					//Push image and set source
					_self.graphics.push(new Image());
					_self.graphics[i].src = el;

					//On load, check if we loaded all images
					_self.graphics[i].onload = function(){
						loadedImages++;

						//Check all images loaded
						if(loadedImages==_self.config.graphics.length){
							//Call initialize function
							_self.initialize();
						}
					};
				});
			}else{
				//Call initialize function
				this.initialize();
			}

			return this;
		},
		initialize: function(){
			//Check for wind
			if(this.config.wind){
				this.windConfig = this.calculateWind();
			}

			//Call necessary functions
			this.setCanvas();
			this.createElements();

			//Bind events
			this.bindResize();
			this.bindRequestKeyframes();
		},
		//Set canvas dimensions according to the sizing mode supplied in the config
		setCanvas: function(){
			//Determine sizing mode
			if(this.config.sizingMode.toLowerCase() === 'css'){
				//Get values from css 
				this.width = parseInt($(this.element).css('width'),10);
				this.height = parseInt($(this.element).css('height'),10);
			}else if(this.config.sizingMode.toLowerCase() === 'parent'){
				//Get dimensions of the parent
				this.width = $(this.element).parent().width();
				this.height = $(this.element).parent().height();
			}else if(this.config.sizingMode.toLowerCase() === 'window'){
				//Get window dimension
				this.width = window.innerWidth;
				this.height = window.innerHeight;
			}else if(this.config.sizingMode.toLowerCase() === 'explicit'){
				//Get window dimension
				this.width = this.config.width;
				this.height = this.config.height;
			}

			//Explicitly set canvas width and height
			this.element.width=this.width;
			this.element.height=this.height;
		},
		//Function to create the elements
		createElements: function(){
			this.particles = [];
			for(var i = 0; i < this.config.amount; i++)
			{
				//Add particle to the array
				this.particles.push(this.createParticle());
			}
		},
		//Function to calculate the values we use in our cosin function when applying wind
		calculateWind: function(){
			//Variables used in cosin function: a * cosin( b * (x-c) ) + d
			var a,b,c,d;
			
			//Calculations based on given variables
			a = 0.5 * ( this.config.maximumWind - this.config.minimumWind);
			b = (Math.PI*2)/this.config.windPeriod;
			c = 0;
			d = a + this.config.minimumWind;

			//Write to variable we use in calculations
			return {
				a:a,
				b:b,
				c:c,
				d:d
			}
		},
		//Function to create a particle
		createParticle: function(config){
			var particle, verticalSpeed, horizontalSpeed, radius,graphic;
			
			//Determine horizontal speed
			if(this.config.randomHorizontalSpeed){
				horizontalSpeed = this.randomValueBetween(this.config.minimumRandomHorizontalSpeed,this.config.maxiumumRandomHorizontalSpeed);
			}else{
				horizontalSpeed = this.config.horizontalSpeed;
			}

			//Determine vertical speed
			if(this.config.randomVerticalSpeed){
				verticalSpeed = this.randomValueBetween(this.config.minimumRandomVerticalSpeed,this.config.maxiumumRandomVerticalSpeed);
			}else{
				verticalSpeed = this.config.verticalSpeed;
			}
			
			//In graphic mode, set graphic
			if(this.config.graphicMode){
				graphic = this.graphics[Math.floor(this.randomValueBetween(0,this.graphics.length-1))];
			}

			//Determine radius
			if(this.config.graphicMode){
				radius = graphic.width / 2;
			}else{
				if(this.config.randomRadius){
					radius = this.randomValueBetween(this.config.minimumRandomRadius,this.config.maxiumRandomRadius);
				}else{
					radius = this.config.radius;
				}
			}

			//Create particle object
			particle =  {
				x: this.randomValueBetween(this.config.horizontalOffsetLeft, this.element.width-this.config.horizontalOffsetRight),
				y: this.randomValueBetween(0,this.element.height),
				verticalSpeed: verticalSpeed,
				horizontalSpeed: horizontalSpeed,
				radius: radius,
				graphic: graphic
			};
			
			//Return particle with any overrides supplied in config
			return $.extend({}, particle, config);
		},
		//Function to get a random value between the supplied values (can be negative values)
		randomValueBetween: function(min,max){
			//Random value for two negative values
			if(min<0 && max<0){
				var absMin = Math.abs(max);
				var absMax = Math.abs(min);
				return Math.random()*(absMax-absMin+1) + min;
			//Random value between a negative and a positive value
			}else if(min<0){
				return Math.random()*(max-min) + min;
			//Random value for two positive values
			}else{
				return Math.random()*(max-min+1) + min;
			}
		},
		//Function to draw all the elements on screen
		drawElements: function(){
			//Clear the context
			this.ctx.clearRect(0, 0, this.element.width, this.element.height);
			
			//Set the fill style
			this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
			
			//Loop through the particles
			for(var i = 0; i < this.config.amount; i++)
			{	
				//Get particle, move to coordinate and draw circle
				var p = this.particles[i];
				
				//Check graphic mode
				if(this.config.graphicMode){
					//Draw image at coordinates
					this.ctx.drawImage(p.graphic,Math.round(p.x),Math.round(p.y));						
				}else{
					//Draw circle at coordinates
					this.ctx.beginPath();
					this.ctx.arc(Math.round(p.x), Math.round(p.y), Math.round(p.radius), 0, Math.PI*2, false);
					this.ctx.fill();
				}
			}
		},
		//Function to update position of the elements
		updateElements: function(){
			//Time used in sin and cos functions
			this.x+= (1/60);

			//Loop through the particles
			for(var i = 0; i < this.config.amount; i++)
			{
				//Get the particle
				var p = this.particles[i];
				
				//Set x position
				if(this.config.wind){
					p.x += p.horizontalSpeed+ (this.windConfig.a * Math.cos(this.windConfig.b*(this.x+this.windConfig.c))+this.windConfig.d);
				}else{
					p.x += p.horizontalSpeed;
				}

				//Set y position
				p.y += p.verticalSpeed;
				
				//Check for out of screen
				if(p.y > this.element.height+p.radius*2){
					//Put the particle on a random coordinate along the top of the screen
					this.particles[i]= this.createParticle({y: 0 - p.radius*2 + this.config.verticalOffsetTop});
				}

				//Check for horizontal mirroring
				if(this.config.horizontalMirroring){
					//Check for out of screen right side
					if(p.x > this.element.width + (p.radius*2)){
						p.x = 0 - p.radius*2;
					}

					//Check for out of screen left side
					if(p.x + (p.radius*2) < 0){
						p.x = this.element.width;
					}
				}
			}
		},
		//Bind resize
		bindResize: function(){
			var _self=this, TO = false;
			
			//Debounced resize handling
			$(window).resize(function() {
				if (TO !== false){
					clearTimeout(TO);
				}
				TO = setTimeout(function(){
					_self.setCanvas();
				}, 300);
			});
		},
		//Bind animation frame
		bindRequestKeyframes: function(){
			//Check for requestAnimationFrame support, fall back to setTimeout (60fps)
			window.requestAnimFrame = (function(){
				return  window.requestAnimationFrame       ||
						window.webkitRequestAnimationFrame ||
						window.mozRequestAnimationFrame    ||
						window.oRequestAnimationFrame      ||
						window.msRequestAnimationFrame     ||
						function( callback ){
							window.setTimeout(callback, 1000 / 60);
						};
			})();

			//Reference to Snowfall context so we can call class functions within the animation loop
			var _self = this;
			(function animloop(){
				//Call for animation loop
				window.requestAnimFrame(animloop);
				
				//Draw all the elements
				_self.drawElements();

				//Update position of elements for the next draw
				_self.updateElements();
			})();
		}
	};

	//Extend Jquery with the SnowFall function/object
	$.fn.Snowfall = function(options) {
		return this.each(function() {
			//Construct new SnowFall object and call init function
			new Snowfall(this, options).init();
		});
	};
})(jQuery, window, document);




