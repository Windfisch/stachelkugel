var menu;
var x_slider;
var x_slider_value;
var y_slider;
var y_slider_value;
var menu_button;

function init_menu(){
	menu = document.getElementById("menu");
	x_slider = document.getElementById("x_slider");
	x_slider_value = document.getElementById("x_slider_value");
	y_slider = document.getElementById("y_slider");
	y_slider_value = document.getElementById("y_slider_value");
	
	menu_button = document.getElementById("menu_button");
	
	x_slider.value = scroll_x;
	y_slider.value = scroll_y;
	
	updateText();
	
	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		menu_button.style.visibility = "visible";
	}
}

function igitt(radio){
	// bitte lass mich jQuery benutzen :(
	console.log(radio.id + ": " + radio.value);
	colormode = radio.value;
}

function handle_slider(slider){
	console.log(slider.id + ": " + slider.value);
	if (slider.id === "x_slider"){
		scroll_x = parseFloat(slider.value);
	}
	else if (slider.id === "y_slider"){
		scroll_y = parseFloat(slider.value);
	}
	
	updateText();
}

function handle_checkbox(box)
{
	console.log(box.id + ": "+box.checked);
	if (box.id === "shadowbox")
		doShadows = (box.checked==true);
	else if (box.id === "debugbox")
		doDebug = (box.checked==true);
}

function updateText(){
	x_slider_value.innerText = scroll_x.toString();
	y_slider_value.innerText = scroll_y.toString();
}

function show_menu(event){
	menu.style.visibility = "visible";
	menu.style.left = event.clientX;
	menu.style.top = event.clientY;
}

function hide_menu(){
	menu.style.visibility = "hidden";
}
