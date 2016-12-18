var gl;
var vbo;
var vPosAttr;
var vColorAttr;
var vPos2Attr;
var vPos3Attr;
var vLevelAttr;
var vertices;

var clicked=false;
var click_events=[];
var curr_spike = 1.;
var prev_spike = 1.;
var curr_spikespeed = 0;
var prev_now = 0;

var data_width=15;

function start()
{
	canvas = document.getElementById("glcanvas");

	//canvas.onclick=click;

	canvas.addEventListener("mousedown", click)
	canvas.addEventListener("touchstart", click)

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


	gl.clearColor(1.,0.,1.,1.);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	initShaders();
	initBuffers();

	drawScene();
}

function getShader(gl, id) {
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

function initShaders()
{
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
	{
		alert("failed to link shader program" + gl.getProgramInfoLog(shaderProgram));
	}

	gl.useProgram(shaderProgram);

	vPosAttr = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(vPosAttr);
	
	vColorAttr = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(vColorAttr);
	
	vPos2Attr = gl.getAttribLocation(shaderProgram, "aVertexPosition2");
	gl.enableVertexAttribArray(vPos2Attr);
	vPos3Attr = gl.getAttribLocation(shaderProgram, "aVertexPosition3");
	gl.enableVertexAttribArray(vPos3Attr);
	
	vLevelAttr = gl.getAttribLocation(shaderProgram, "aVertexLevels");
	gl.enableVertexAttribArray(vLevelAttr);
	
}

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

function click(event) {
	event.preventDefault();
	clicked=true;
}

function add_vertices(array)
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
					result = result.concat( v[k], c[k], [42,42,42,43,43,43,  level[k], 0,0] );
				else
					result = result.concat( [mid[0],mid[1],mid[2]], [cmid[0],cmid[1],cmid[2]], [42,42,42,43,43,43, newlevel,0,0] );
			}
		}
	}

	return result;
}

function initBuffers()
{
	if (false)
	vertices = [ 
			  1, -1, 1. ,0,0,1, 42,42,42, 43,43,43, 0,0,0,
			  1,  1, -1, 0,1,0, 42,42,42, 43,43,43, 0,0,0,
			 -1,  1, 1. ,1,1,0, 42,42,42, 43,43,43, 0,0,0,

			 -1, -1, -1, 1,0,0, 42,42,42, 43,43,43, 0,0,0,
			  1, -1, 1. ,0,0,1, 42,42,42, 43,43,43, 0,0,0,
			 -1,  1, 1. ,1,1,0, 42,42,42, 43,43,43, 0,0,0,

			  1,  1, -1, 0,1,0, 42,42,42, 43,43,43, 0,0,0,
			 -1, -1, -1, 1,0,0, 42,42,42, 43,43,43, 0,0,0,
			 -1,  1, 1. ,1,1,0, 42,42,42, 43,43,43, 0,0,0,

			 -1, -1, -1, 1,0,0, 42,42,42, 43,43,43, 0,0,0,
			  1,  1, -1, 0,1,0, 42,42,42, 43,43,43, 0,0,0,
			  1, -1, 1. ,0,0,1, 42,42,42, 43,43,43, 0,0,0,

			  ];
	else
	vertices = [
			 1, 0, 0,   1,0,0,  42,42,42, 43,43,43, 0,0,0,
			 0, 1, 0,   0,1,0,  42,42,42, 43,43,43, 0,0,0,
			 0, 0, 1,   0,0,1,  42,42,42, 43,43,43, 0,0,0,

			 0, 1, 0,   0,1,0,  42,42,42, 43,43,43, 0,0,0,
			 1, 0, 0,   1,0,0,  42,42,42, 43,43,43, 0,0,0,
			 0, 0,-1,   1,1,0,  42,42,42, 43,43,43, 0,0,0,

			 0,-1, 0,   1,0,1,  42,42,42, 43,43,43, 0,0,0,
			 1, 0, 0,   1,0,0,  42,42,42, 43,43,43, 0,0,0,
			 0, 0, 1,   0,0,1,  42,42,42, 43,43,43, 0,0,0,

			 1, 0, 0,   1,0,0,  42,42,42, 43,43,43, 0,0,0,
			 0,-1, 0,   1,0,1,  42,42,42, 43,43,43, 0,0,0,
			 0, 0,-1,   1,1,0,  42,42,42, 43,43,43, 0,0,0,

			 0, 1, 0,   0,1,0,  42,42,42, 43,43,43, 0,0,0,
			-1, 0, 0,   0,1,1,  42,42,42, 43,43,43, 0,0,0,
			 0, 0, 1,   0,0,1,  42,42,42, 43,43,43, 0,0,0,

			-1, 0, 0,   0,1,1,  42,42,42, 43,43,43, 0,0,0,
			 0, 1, 0,   0,1,0,  42,42,42, 43,43,43, 0,0,0,
			 0, 0,-1,   1,1,0,  42,42,42, 43,43,43, 0,0,0,

			-1, 0, 0,   0,1,1,  42,42,42, 43,43,43, 0,0,0,
			 0,-1, 0,   1,0,1,  42,42,42, 43,43,43, 0,0,0,
			 0, 0, 1,   0,0,1,  42,42,42, 43,43,43, 0,0,0,

			-1, 0, 0,   0,1,1,  42,42,42, 43,43,43, 0,0,0,
			 0, 0,-1,   1,1,0,  42,42,42, 43,43,43, 0,0,0,
			 0,-1, 0,   1,0,1,  42,42,42, 43,43,43, 0,0,0,
		];

	console.log(add_vertices(vertices));

	for (var i=0; i<4; i++)
		vertices = add_vertices(vertices);
	
	console.log("have "+vertices.length/data_width+" vertices");

	for (var i=0; i<vertices.length/data_width; i+=3)
	{
		var v = [
			[vertices[data_width*(i+0)+0], vertices[data_width*(i+0)+1], vertices[data_width*(i+0)+2]],
			[vertices[data_width*(i+1)+0], vertices[data_width*(i+1)+1], vertices[data_width*(i+1)+2]],
			[vertices[data_width*(i+2)+0], vertices[data_width*(i+2)+1], vertices[data_width*(i+2)+2]],
			];

		var levels = [ vertices[data_width*(i+0)+12],  vertices[data_width*(i+1)+12],  vertices[data_width*(i+2)+12] ];
	
		for (var j=0; j<3; j++)
		{
			vertices[data_width*(i+j)+6] = v[(j+1)%3][0];
			vertices[data_width*(i+j)+7] = v[(j+1)%3][1];
			vertices[data_width*(i+j)+8] = v[(j+1)%3][2];
			vertices[data_width*(i+j)+13] = levels[(j+1)%3];
			vertices[data_width*(i+j)+9] = v[(j+2)%3][0];
			vertices[data_width*(i+j)+10]= v[(j+2)%3][1];
			vertices[data_width*(i+j)+11]= v[(j+2)%3][2];
			vertices[data_width*(i+j)+14] = levels[(j+2)%3];
		}
	}
	
	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	
	gl.cullFace(gl.BACK);
	gl.enable(gl.CULL_FACE);
}

function cosfade(x, a,b)
{
	var c = -Math.cos(x*3.1415) / 2 + 0.5;

	return (c*b + (1-c)*a);
}

function drawScene(now)
{
	gl.clearColor(1.,1.,1.,1.);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var perspectiveMatrix = mat4.create();
	mat4.perspective(perspectiveMatrix, 3.1415/14, 1, .1, 100.0);
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.vertexAttribPointer(vPosAttr, 3, gl.FLOAT, false, data_width*4, 0*4);
	gl.vertexAttribPointer(vColorAttr, 3, gl.FLOAT, false, data_width*4, 3*4);
	gl.vertexAttribPointer(vPos2Attr, 3, gl.FLOAT, false, data_width*4, 6*4);
	gl.vertexAttribPointer(vPos3Attr, 3, gl.FLOAT, false, data_width*4, 9*4);
	gl.vertexAttribPointer(vLevelAttr, 3, gl.FLOAT, false, data_width*4, 12*4);


	var mvMatrix = mat4.create();
	mat4.identity(mvMatrix);
	
	var angle = now * 3.1415 / 3000;
	mat4.translate(mvMatrix, mvMatrix, [0,0,-20]);
	mat4.rotate(mvMatrix, mvMatrix, angle, [Math.sin(now/10000) ,Math.cos(now/13000),-.1]);

	//setMatrixUniforms();
	var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	gl.uniformMatrix4fv(pUniform, false, perspectiveMatrix);
	
	var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	gl.uniformMatrix4fv(mvUniform, false, mvMatrix);


	if (clicked == true)
	{
		click_events.push([now, curr_spikespeed]);
		console.log(curr_spikespeed);
		clicked=false;
	}

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

		if (t<t4)
			console.log(s2, click_events[i][1]);

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
	
	var spikeUniform = gl.getUniformLocation(shaderProgram, "spike");
	gl.uniform1f(spikeUniform, curr_spike*0.5);
	//gl.uniform1f(spikeUniform,0.5+0.5* Math.sin(now*3.1415/1000));
	
	
	gl.drawArrays(gl.TRIANGLES, 0, vertices.length/data_width);
	
	requestAnimationFrame(drawScene);
}

function setMatrixUniforms()
{
}
