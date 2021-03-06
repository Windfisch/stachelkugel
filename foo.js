var gl;
var vbo;

var shaders = {
	draw: {
		name: "draw",
		program: null,
		attrs: {},
		uniforms: {}
	},

	draw_noshadow: {
		name: "draw(noshadow)",
		program: null,
		attrs: {},
		uniforms: {}
	},

	depthToRGB: {
		name: "depthToRGB",
		program: null,
		attrs: {},
		uniforms: {}
	},

	debug: {
		name: "debug",
		program: null,
		attrs: {},
		uniforms: {}
	}
};

// webGL attribute handles
var vertices;

// explosion and respawn counters
var EXPLODE_NEVER = 99999999;
var explosion_time = EXPLODE_NEVER;
var spawn_time = 300;

// state for clicks
var clicked=false;
var click_events=[[spawn_time,0]];
var curr_spike = 1.;
var prev_spike = 1.;
var curr_spikespeed = 0;
var prev_now = 0;

var data_width=19; // don't change this. number of floats per vertex

var colormode=0; // range: 0-3, passed as uniform 'colormode' to the shaders

var scroll_x=0.75;
var scroll_x_raw=1500;
var scroll_y=0.5;
var scroll_y_raw=1000;

var doDebug = false;
var doShadows = false;
var haveDepthTexture = false;
var depthTextureExt;
var depthTexture;
var shadowsize_x = 512*2;
var shadowsize_y = 512*2;
var framebuffer_shadow = null;


var fps_lastsecond = 0;
var fps_lastframe = 0;
var fps_maxduration = 0;
var fps_count = 0;

function resize()
{
	canvas.height = canvas.clientHeight;
	canvas.width = canvas.clientWidth;;
}

function start()
{
	init_menu();
	
	canvas = document.getElementById("glcanvas");

//canvas.onclick=click;

	// canvas.addEventListener("mousewheel", function(e) {
		// scroll_y_raw += e.deltaY;
		// scroll_y_raw=Math.min(scroll_y_raw, 2000);
		// scroll_y_raw=Math.max(0,scroll_y_raw);
		
		// scroll_y = scroll_y_raw/2000.;
		
		// scroll_x_raw -= e.deltaX;
		// scroll_x_raw=Math.min(scroll_x_raw, 2000);
		// scroll_x_raw=Math.max(0,scroll_x_raw);
		
		// scroll_x = scroll_x_raw/2000.;
	// });

	canvas.addEventListener("mousedown", click)
	canvas.addEventListener("touchstart", click)
	
	document.body.addEventListener("contextmenu", function(e) { e.preventDefault(); e.stopPropagation(); return false; }); // disable annoying context menu

	try
	{
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	}
	catch(e)
	{
		alert("webgl init failed");
		gl = null;
		return;
	}

	doShadows=true;
	
	depthTextureExt = gl.getExtension("WEBGL_depth_texture") || gl.getExtension("MOZ_WEBGL_depth_texture") || gl.getExtension("WEBKIT_WEBGL_depth_texture"); // Or browser-appropriate prefix
	//depthTextureExt=null; // FIXME
	if(!depthTextureExt)
	{
		console.log("no depth texture extension, falling back to rgb unpacking");
		haveDepthTexture = false;

		framebuffer_shadow = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer_shadow);

		depthTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, depthTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, shadowsize_x, shadowsize_y, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthTexture, 0);

		var depth_renderbuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, depth_renderbuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, shadowsize_x, shadowsize_y);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth_renderbuffer);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
	else
	{
		haveDepthTexture = true;
	
	// Create the depth texture
		depthTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, depthTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, shadowsize_x, shadowsize_y, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

		framebuffer_shadow = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer_shadow);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}


	gl.clearColor(1.,0.,1.,1.);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


	initShaders();
	initBuffers();
	
	window.addEventListener("resize", resize, false);
	resize();

	animation_frame(0);
	//requestAnimationFrame(animation_frame);
}

function getShader(gl, id, prepend) {
	var shaderScript = document.getElementById(id);

	if (!shaderScript) {
		return null;
	}

	var theSource = "";
	var currentChild = shaderScript.firstChild;

	while(currentChild) {
		if (currentChild.nodeType == 3) {
			theSource += currentChild.textContent;
		}

		currentChild = currentChild.nextSibling;
	}

	var shader;

	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;  // Unbekannter Shadertyp
	}

	if (prepend !== undefined)
		theSource = prepend + theSource;
	
	gl.shaderSource(shader, theSource);

	// Kompiliere das Shaderprogramm

	gl.compileShader(shader);

	// Überprüfe, ob die Kompilierung erfolgreich war

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert("Es ist ein Fehler beim Kompilieren der Shader aufgetaucht: " + gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function initDrawShader(shader, doShadow)
{
	var fsconfig = 'const bool doShadow = '+doShadow+';\nconst bool haveDepthTextureExtension = '+haveDepthTexture+";\n";

	initShader(shader, "shader-vs", "shader-fs",
		["aVertexPosition", "aVertexPosition2", "aVertexPosition3", "aVertexLevels", "aFaceRotation", "aVertexColor"],
		["uPMatrix", "uMVMatrix", "uLightMVPMatrix", "spike", "spikeparam1", "spikeparam2", "colormode", "explosion_time", "spawn_time", "depth_map", "light_pos"],
		fsconfig);
}

function initShaders()
{
	initDrawShader(shaders.draw, true);
	initDrawShader(shaders.draw_noshadow, false);

	initShader(shaders.depthToRGB, "shader-vs", "shader-fs-depthtocolor",
		["aVertexPosition", "aVertexPosition2", "aVertexPosition3", "aVertexLevels", "aFaceRotation"],
		["uPMatrix", "uMVMatrix", "spike", "spikeparam1", "spikeparam2", "explosion_time", "spawn_time"]);
	
	initShader(shaders.debug, "shader-debugvs", "shader-debugfs",
		["point"],
		["tex"]);
}

function initShader(shader, vsname, fsname, attrs, uniforms, fsconfig)
{
	console.log("initializing "+fsname+"/"+vsname+" with config "+fsconfig);
	var fragmentShader = getShader(gl, fsname, fsconfig);
	var vertexShader = getShader(gl, vsname);

	shader.program = gl.createProgram();
	gl.attachShader(shader.program, vertexShader);
	gl.attachShader(shader.program, fragmentShader);
	gl.linkProgram(shader.program);

	gl.useProgram(shader.program);

	for (var i=0; i<attrs.length; i++)
	{
		var handle = gl.getAttribLocation(shader.program, attrs[i]);
		if (handle>=0)
			shader.attrs[attrs[i]] = handle;
		else
			console.log("could not find attribute '"+attrs[i]+"'");
	}

	for (var i=0; i<uniforms.length; i++)
	{
		var handle = gl.getUniformLocation(shader.program, uniforms[i]);
		if (handle != null)
			shader.uniforms[uniforms[i]]=handle;
		else
			console.log("could not find uniform '"+uniforms[i]+"' (is: "+handle+")");
	}

	gl.useProgram(null);
}

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

function next_color() {
	colormode = (colormode+1)%4;
}

function click(event) {
	event.preventDefault(); // prevent touch events from emulating a subsequent mousedown
	if(event instanceof MouseEvent){
		if (event.button === 0){ // left mouse button
			clicked=true;
			hide_menu();
		} if (event.button === 2) { // right mouse button
			show_menu(event);
		}
	}
	else if (event instanceof TouchEvent) {
		clicked=true;
		hide_menu();
	}
}

function add_vertices(array) // refine structure: replaces each tri by four tris, adding the tri's midpoint as new point
{
	var result = new Array();
	var l = array.length / (3*data_width);

	for (var ii=0; ii<l; ii++)
	{
		var i = [ii*3*data_width, ii*3*data_width + data_width, ii*3*data_width + 2*data_width];

		var v = [
				[array[i[0]+0], array[i[0]+1], array[i[0]+2]],
				[array[i[1]+0], array[i[1]+1], array[i[1]+2]],
				[array[i[2]+0], array[i[2]+1], array[i[2]+2]]
			];
		var c = [
				[array[i[0]+3], array[i[0]+4], array[i[0]+5]],
				[array[i[1]+3], array[i[1]+4], array[i[1]+5]],
				[array[i[2]+3], array[i[2]+4], array[i[2]+5]]
			];

		var level = [ array[i[0]+12], array[i[1]+12], array[i[2]+12] ];
		var newlevel = Math.max(level[0],level[1],level[2]) + 1;

		var mid = vec3.create();
		for (var j=0; j<3; j++) vec3.add(mid,mid,v[j]);
		vec3.scale(mid, mid, 1./3);
		var alpha = 1;
		var beta = 1;
		vec3.scale(mid, mid, beta* (alpha + (1-alpha)*(vec3.len(v[0]) / vec3.len(mid))) );

		var cmid = vec3.create();
		for (var j=0; j<3; j++) vec3.add(cmid,cmid,c[j]);
		vec3.scale(cmid, cmid, 1./3);

		for (var j=0; j<3; j++)
		{
			for (var k=0; k<3; k++)
			{
				if (k!=j)
					result = result.concat( v[k], c[k], [42,42,42,43,43,43,  level[k], 0,0,  13,37,13,37] );
				else
					result = result.concat( [mid[0],mid[1],mid[2]], [cmid[0],cmid[1],cmid[2]], [42,42,42,43,43,43, newlevel,0,0, 13,37,13,37] );
			}
		}
	}

	return result;
}

function initBuffers()
{
	debug_vertices = [  1,  1,
			   -1, -1,
			    1, -1,

			   -1, -1,
			    1,  1,
			   -1,  1 ];

	debug_vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, debug_vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(debug_vertices), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	if (false) // either a tetraeder or an octaeder
	vertices = [ 
		// we need to calculate the surface normals in the shaders.
		// As there is no geometry shader in webGL, we have to do
		// this hack: each vertex knows about the two other vertices
		// in its triangle, and also about their levels. this is wasteful
		// about 2/3 of redundant data, but I don't see another way to
		// emulate the missing geometry shader :|
		// The `level` is the add_vertices-iteration at which the vertex
		// was added.
		//
		// vertex2, vertex3 and level2,3 are filled with dummy values right now.
		// after add_vertices(), they get filled in with sensible values
		// (search for 'fill vertex2,3')
			// vertex    color   vertex2  vertex3   level1,2,3
			  1, -1, 1. ,0,0,1, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			  1,  1, -1, 0,1,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 -1,  1, 1. ,1,1,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			 -1, -1, -1, 1,0,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			  1, -1, 1. ,0,0,1, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 -1,  1, 1. ,1,1,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			  1,  1, -1, 0,1,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 -1, -1, -1, 1,0,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 -1,  1, 1. ,1,1,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			 -1, -1, -1, 1,0,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			  1,  1, -1, 0,1,0, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			  1, -1, 1. ,0,0,1, 42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			  ];
	else
	vertices = [
			 1, 0, 0,   1,0,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 1, 0,   0,1,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 0, 1,   0,0,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			 0, 1, 0,   0,1,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 1, 0, 0,   1,0,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 0,-1,   1,1,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			 0,-1, 0,   1,0,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 1, 0, 0,   1,0,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 0, 1,   0,0,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			 1, 0, 0,   1,0,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0,-1, 0,   1,0,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 0,-1,   1,1,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			 0, 1, 0,   0,1,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			-1, 0, 0,   0,1,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 0, 1,   0,0,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			-1, 0, 0,   0,1,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 1, 0,   0,1,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 0,-1,   1,1,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			-1, 0, 0,   0,1,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0,-1, 0,   1,0,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 0, 1,   0,0,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,

			-1, 0, 0,   0,1,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0, 0,-1,   1,1,0,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
			 0,-1, 0,   1,0,1,  42,42,42, 43,43,43, 0,0,0, 13,37,13,37,
		];

	for (var i=0; i<4; i++)
		vertices = add_vertices(vertices);
	
	// fill vertex2,3
	for (var i=0; i<vertices.length/data_width; i+=3) // for each triangle
	{
		var v = [
			[vertices[data_width*(i+0)+0], vertices[data_width*(i+0)+1], vertices[data_width*(i+0)+2]],
			[vertices[data_width*(i+1)+0], vertices[data_width*(i+1)+1], vertices[data_width*(i+1)+2]],
			[vertices[data_width*(i+2)+0], vertices[data_width*(i+2)+1], vertices[data_width*(i+2)+2]],
			];

		var levels = [ vertices[data_width*(i+0)+12],  vertices[data_width*(i+1)+12],  vertices[data_width*(i+2)+12] ];
	
		var rot_axis = vec3.create();
		vec3.random(rot_axis);
		var rot_speed = Math.random() * Math.PI * 2 + Math.PI/2;

		for (var j=0; j<3; j++) // for each vector in that triangle
		{
			vertices[data_width*(i+j)+6] = v[(j+1)%3][0];
			vertices[data_width*(i+j)+7] = v[(j+1)%3][1];
			vertices[data_width*(i+j)+8] = v[(j+1)%3][2];
			vertices[data_width*(i+j)+13] = levels[(j+1)%3];
			vertices[data_width*(i+j)+9] = v[(j+2)%3][0];
			vertices[data_width*(i+j)+10]= v[(j+2)%3][1];
			vertices[data_width*(i+j)+11]= v[(j+2)%3][2];
			vertices[data_width*(i+j)+14] = levels[(j+2)%3];

			vertices[data_width*(i+j)+15] = rot_axis[0];
			vertices[data_width*(i+j)+16] = rot_axis[1];
			vertices[data_width*(i+j)+17] = rot_axis[2];
			vertices[data_width*(i+j)+18] = rot_speed;
		}
	}
	
	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	gl.cullFace(gl.BACK);
	gl.enable(gl.CULL_FACE); // TODO FIXME lighting need inverted normals now
}

function cosfade(x, a,b)
{
	var c = -Math.cos(x*3.1415) / 2 + 0.5;

	return (c*b + (1-c)*a);
}

function drawDebug(now)
{
	gl.useProgram(shaders.debug.program);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	gl.clearColor(1.,1.,0.,1.);
	gl.disable(gl.DEPTH_TEST);
	gl.clear(gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT)
	
	gl.viewport(0,0, canvas.width, canvas.height);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, depthTexture);
	gl.uniform1i(gl.getUniformLocation(shaders.debug.program, "tex"), 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, debug_vbo);
	gl.enableVertexAttribArray(shaders.debug.attrs['point']);
	gl.vertexAttribPointer(shaders.debug.attrs['point'], 2, gl.FLOAT, false, 0,0);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.enable(gl.DEPTH_TEST);
	gl.disableVertexAttribArray(shaders.debug.attrs['point']);
	gl.useProgram(null);
}

function log_fps(now)
{
	var frameduration = now - fps_lastframe;
	fps_lastframe = now;

	if (fps_maxduration < frameduration)
		fps_maxduration = frameduration;
	
	if (now > fps_lastsecond + 1000)
	{
		console.log("FPS: "+fps_count+", max. frameduration = "+fps_maxduration+" ("+1000/fps_maxduration+" FPS)");
		fps_count=0;
		fps_maxduration=0;
		fps_lastsecond=now;
	}
	fps_count++;
}

function animation_frame(now)
{
	handle_input(now);
	calc_stuff(now);
	drawScene(now);
	if (doDebug)
		drawDebug(now);
	//log_fps(now);

	requestAnimationFrame(animation_frame);
}

function handle_input(now)
{
	if (clicked == true)
	{
		if (explosion_time == EXPLODE_NEVER)
			click_events.push([now, curr_spikespeed]);
		clicked=false;
	}
}

function calc_stuff(now)
{
	curr_spike = 1;

	for (var i=0; i<click_events.length; i++)
	{
		var spike;
		var t = now - click_events[i][0];

		var s1=0.;
		var s2=2 * Math.max(1,  1+Math.min(10,-click_events[i][1]/10 ));
		var sbase=1;

		var t1=100;
		var t2=300;
		var t3=500;
		var t4=700;

		var s3=0.7;
		if (t < t1)
			spike = cosfade(t/t1, sbase, s1);
		else if (t < t2)
			spike = cosfade((t-t1)/(t2-t1), s1, s2);
		else if (t < t3)
			spike = cosfade((t-t2)/(t3-t2), s2, s3);
		else if (t < t4)
			spike = cosfade((t-t3)/(t4-t3), s3, sbase);
		else
			spike = sbase;

		curr_spike *= spike;
	}

	curr_spikespeed = (curr_spike - prev_spike) / (now - prev_now) * 1000;
	prev_now = now;
	prev_spike=curr_spike;

	if (curr_spike > 15) // explode
	{
		explosion_time = now;
		gl.disable(gl.CULL_FACE); // TODO FIXME lighting need inverted normals now
	}

	if (now > explosion_time + 5000)
	{
		explosion_time = EXPLODE_NEVER;
		spawn_time = now;
		clicked=true;
		gl.enable(gl.CULL_FACE);
	}
}

function drawScene(now)
{
	const camPos = [0,0,20];
	const lightPos = [-8,15,20];

	var perspectiveMatrix = mat4.create();
	mat4.perspective(perspectiveMatrix, 3.1415/14, canvas.width/canvas.height, 10, 40.0);

	var lightDist = vec3.len(lightPos);
	var perspectiveMatrixLight = mat4.create();
	mat4.perspective(perspectiveMatrixLight, 3.1415/16, shadowsize_x/shadowsize_y, lightDist-3, lightDist+3);

	var angle = now * 3.1415 / 6000;
	var axis = [Math.sin(now/10000) ,Math.cos(now/13000),-.1];
	var rotationMatrix = mat4.create();
	mat4.fromRotation(rotationMatrix, angle, axis);

	var cameraMatrix = mat4.create();
	mat4.lookAt(cameraMatrix, camPos, [0,0,0], [0,1,0]);

	var lightMatrix = mat4.create();
	mat4.lookAt(lightMatrix, lightPos, [0,0,0], [0,1,0]);

	var lightPosInCamSpace = vec3.create();
	vec3.transformMat4(lightPosInCamSpace, lightPos, cameraMatrix);

	var mvMatrix = mat4.create();
	mat4.mul(mvMatrix, cameraMatrix, rotationMatrix);

	var mvMatrixLight = mat4.create();
	mat4.mul(mvMatrixLight, lightMatrix, rotationMatrix);

	var mvpMatrixLight = mat4.clone(perspectiveMatrixLight);
	mat4.mul(mvpMatrixLight, mvpMatrixLight, mvMatrixLight);

	if (doShadows)
	{
		gl.useProgram(shaders.depthToRGB.program);
		setup_vbo(shaders.depthToRGB);
		
		gl.viewport(0, 0, shadowsize_x, shadowsize_y);
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer_shadow);
		if (haveDepthTexture)
		{
			gl.colorMask(false,false,false,false);
			gl.clear(gl.DEPTH_BUFFER_BIT);
		}
		else
		{
			gl.colorMask(true,true,true,true);
			gl.clearColor(1,1,1,0);
			gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
		}
		gl.enable(gl.DEPTH_TEST);
		
		set_uniforms(now, shaders.depthToRGB.program, perspectiveMatrixLight, mvMatrixLight, mvpMatrixLight, lightPosInCamSpace);
		gl.drawArrays(gl.TRIANGLES, 0, vertices.length/data_width);

		cleanup_vbo(shaders.depthToRGB);
		gl.useProgram(null);
	}

	var drawshader = doShadows ? shaders.draw : shaders.draw_noshadow;

	gl.useProgram(drawshader.program);
	setup_vbo(drawshader);
	
	gl.viewport(0, 0, canvas.width, canvas.height, mvpMatrixLight);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.colorMask(true,true,true,true);
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(1.,1.,1.,1.);
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
	
	set_uniforms(now, drawshader.program, perspectiveMatrix, mvMatrix, mvpMatrixLight, lightPosInCamSpace);
	gl.drawArrays(gl.TRIANGLES, 0, vertices.length/data_width);

	cleanup_vbo(drawshader);
	gl.useProgram(null);
}


/* binds the vbo and sets the vertexAttribPointers */
function setup_vbo(shader)
{
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	var data = [
		["aVertexPosition",3],
		["aVertexColor",3],
		["aVertexPosition2",3],
		["aVertexPosition3",3],
		["aVertexLevels",3],
		["aFaceRotation",4]
	];

	var offset = 0;
	for (var i=0; i<data.length; i++)
	{
		if (shader.attrs[data[i][0]] != undefined)
		{
			gl.enableVertexAttribArray(shader.attrs[data[i][0]]);
			gl.vertexAttribPointer(shader.attrs[data[i][0]], data[i][1], gl.FLOAT, false, data_width*4, offset*4);
		}
		offset = offset + data[i][1];
	}
}

function cleanup_vbo(shader)
{
	for (attr in shader.attrs)
		gl.disableVertexAttribArray(shader.attrs[attr]);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function set_uniforms(now, prog, perspectiveMatrix, mvMatrix, light_mvpMatrix, light_pos)
{
	var pUniform = gl.getUniformLocation(prog, "uPMatrix");
	gl.uniformMatrix4fv(pUniform, false, perspectiveMatrix);
	
	var mvUniform = gl.getUniformLocation(prog, "uMVMatrix");
	gl.uniformMatrix4fv(mvUniform, false, mvMatrix);

	var lmvpUniform = gl.getUniformLocation(prog, "uLightMVPMatrix");
	gl.uniformMatrix4fv(lmvpUniform, false, light_mvpMatrix);

	var spikeUniform = gl.getUniformLocation(prog, "spike");
	gl.uniform1f(spikeUniform, curr_spike*0.5);

	var spikeParam1Uniform = gl.getUniformLocation(prog, "spikeparam1");
	gl.uniform1f(spikeParam1Uniform, scroll_y + 0.3*scroll_x*Math.sin(now*3.1415/200) * Math.pow ( Math.sin(now*3.1415/2000), 5)  );

	var spikeParam2Uniform = gl.getUniformLocation(prog, "spikeparam2");
	gl.uniform1f(spikeParam2Uniform, scroll_x);

	var colormodeUniform = gl.getUniformLocation(prog, "colormode");
	gl.uniform1i(colormodeUniform, colormode);
	
	var etimeUniform = gl.getUniformLocation(prog, "explosion_time");
	gl.uniform1f(etimeUniform, Math.max(0.,(now-explosion_time)/1000.));
	
	var stimeUniform = gl.getUniformLocation(prog, "spawn_time");
	gl.uniform1f(stimeUniform, Math.max(0.,(now-spawn_time)/1000.));

	gl.uniform3fv(gl.getUniformLocation(prog, "light_pos"), light_pos);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, depthTexture);
	gl.uniform1i(gl.getUniformLocation(shaders.debug.program, "depth_map"), 0);
}

function setScrollY(value){
	scroll_y = value;
}
