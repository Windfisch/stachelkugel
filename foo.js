var gl;
var vbo;
var vPosAttr;
var vColorAttr;
var vNormalAttr;
var vertices;

var data_width=9;

function start()
{
	canvas = document.getElementById("glcanvas");
	
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

	//drawScene();

	requestAnimationFrame(drawScene);
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
	
	vNormalAttr = gl.getAttribLocation(shaderProgram, "aVertexNormal");
	gl.enableVertexAttribArray(vNormalAttr);
	
}

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
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

		var mid = vec3.create();
		for (var j=0; j<3; j++) vec3.add(mid,mid,v[j]);
		vec3.scale(mid, mid, 1./3);
		var alpha = .8;
		var beta = 1.3;
		vec3.scale(mid, mid, beta* (alpha + (1-alpha)*(vec3.len(v[0]) / vec3.len(mid))) );

		var cmid = vec3.create();
		for (var j=0; j<3; j++) vec3.add(cmid,cmid,c[j]);
		vec3.scale(cmid, cmid, 1./3);

		for (var j=0; j<3; j++)
		{
			for (var k=0; k<3; k++)
			{
				if (k!=j)
					result = result.concat( v[k], c[k], [42,42,42] );
				else
					result = result.concat( [mid[0],mid[1],mid[2]], [cmid[0],cmid[1],cmid[2]], [43,43,43] );
			}
		}
	}

	return result;
}

function initBuffers()
{
	if (false)
	vertices = [ 
			  1, -1, 1. ,0,0,1, 42,42,42,
			  1,  1, -1, 0,1,0, 42,42,42,
			 -1,  1, 1. ,1,1,0, 42,42,42,

			 -1, -1, -1, 1,0,0, 42,42,42,
			  1, -1, 1. ,0,0,1, 42,42,42,
			 -1,  1, 1. ,1,1,0, 42,42,42,
			 
			  1,  1, -1, 0,1,0, 42,42,42,
			 -1, -1, -1, 1,0,0, 42,42,42,
			 -1,  1, 1. ,1,1,0, 42,42,42,
			 
			 -1, -1, -1, 1,0,0, 42,42,42,
			  1,  1, -1, 0,1,0, 42,42,42,
			  1, -1, 1. ,0,0,1, 42,42,42,

			  ];
	else
	vertices = [
			 1, 0, 0,   1,0,0,  42,42,42,
			 0, 1, 0,   0,1,0,  42,42,42,
			 0, 0, 1,   0,0,1,  42,42,42,

			 0, 1, 0,   0,1,0,  42,42,42,
			 1, 0, 0,   1,0,0,  42,42,42,
			 0, 0,-1,   1,1,0,  42,42,42,

			 0,-1, 0,   1,0,1,  42,42,42,
			 1, 0, 0,   1,0,0,  42,42,42,
			 0, 0, 1,   0,0,1,  42,42,42,

			 1, 0, 0,   1,0,0,  42,42,42,
			 0,-1, 0,   1,0,1,  42,42,42,
			 0, 0,-1,   1,1,0,  42,42,42,

			 0, 1, 0,   0,1,0,  42,42,42,
			-1, 0, 0,   0,1,1,  42,42,42,
			 0, 0, 1,   0,0,1,  42,42,42,

			-1, 0, 0,   0,1,1,  42,42,42,
			 0, 1, 0,   0,1,0,  42,42,42,
			 0, 0,-1,   1,1,0,  42,42,42,

			-1, 0, 0,   0,1,1,  42,42,42,
			 0,-1, 0,   1,0,1,  42,42,42,
			 0, 0, 1,   0,0,1,  42,42,42,

			-1, 0, 0,   0,1,1,  42,42,42,
			 0, 0,-1,   1,1,0,  42,42,42,
			 0,-1, 0,   1,0,1,  42,42,42,
		];

	for (var i=0; i<5; i++)
		vertices = add_vertices(vertices);
	
	console.log("have "+vertices.length+" vertices");

	for (var i=0; i<vertices.length/data_width; i+=3)
	{
		var c = vec3.create();
		var v = [
			[vertices[data_width*(i+0)+0], vertices[data_width*(i+0)+1], vertices[data_width*(i+0)+2]],
			[vertices[data_width*(i+1)+0], vertices[data_width*(i+1)+1], vertices[data_width*(i+1)+2]],
			[vertices[data_width*(i+2)+0], vertices[data_width*(i+2)+1], vertices[data_width*(i+2)+2]],
			];
	
		var d1 = vec3.create();
		var d2 = vec3.create();

		vec3.sub(d1,v[0],v[1]);
		vec3.sub(d2,v[0],v[2]);
		vec3.cross(c, d1,d2);

		var mid = vec3.create();
		vec3.add(mid,mid,v[0]);
		vec3.add(mid,mid,v[1]);
		vec3.add(mid,mid,v[2]);
		vec3.scale(mid,mid,1./3.);

		vec3.normalize(c,c);
		for (var j=0; j<3; j++)
		{
			var cc = vec3.clone(c);

			var d_mid = vec3.create();
			vec3.sub(d_mid, v[j], mid);
			vec3.normalize(d_mid, d_mid);
			vec3.scale(d_mid, d_mid, 1);

			vec3.add(cc, c, d_mid);
			vec3.normalize(cc,cc);

			vertices[data_width*(i+j)+6] = cc[0];
			vertices[data_width*(i+j)+7] = cc[1];
			vertices[data_width*(i+j)+8] = cc[2];
		}
	}
	
	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	
	gl.cullFace(gl.BACK);
	gl.enable(gl.CULL_FACE);
}


function drawScene(now)
{
	gl.clearColor(1.,1.,1.,1.);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var perspectiveMatrix = mat4.create();
	mat4.perspective(perspectiveMatrix, 3.1415/16, 1, .1, 100.0);
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.vertexAttribPointer(vPosAttr, 3, gl.FLOAT, false, data_width*4, 0*4);
	gl.vertexAttribPointer(vColorAttr, 3, gl.FLOAT, false, data_width*4, 3*4);
	gl.vertexAttribPointer(vNormalAttr, 3, gl.FLOAT, false, data_width*4, 6*4);


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
	
	
	gl.drawArrays(gl.TRIANGLES, 0, vertices.length/data_width);
	
	requestAnimationFrame(drawScene);
}

function setMatrixUniforms()
{
}
