var menu;
var x_slider;
var x_slider_value;
var y_slider;
var y_slider_value;

function init_menu(){
	menu = document.getElementById("menu");
	x_slider = document.getElementById("x_slider");
	x_slider_value = document.getElementById("x_slider_value");
	y_slider = document.getElementById("y_slider");
	y_slider_value = document.getElementById("y_slider_value");
	
	x_slider.value = scroll_x;
	y_slider.value = scroll_y;
	
	updateText();
}

function igitt(radio){
	// bitte lass mich jQuery benutzen :(
	console.log(radio.id + ": " + radio.value);
	colormode = radio.value;
}

function handle_slider(slider){
	console.log(slider.id + ": " + slider.value);
	if (slider.id === "x_slider"){
		scroll_x = slider.value;
		scroll_x_raw = slider.value*2000;
	}
	// ICH HABE KEINE AHNUNG WIESO DAS NICHT GEHT
	else if (slider.id === "y_slider"){
		scroll_y = slider.value;
		scroll_y_raw = slider.value*2000;
	}
	
	updateText();
}

function updateText(){
	x_slider_value.innerText = scroll_x;
	y_slider_value.innerText = scroll_y;
}

function show_menu(event){
	menu.style.visibility = "visible";
	menu.style.left = event.clientX;
	menu.style.top = event.clientY;
}

function hide_menu(){
	menu.style.visibility = "hidden";
}