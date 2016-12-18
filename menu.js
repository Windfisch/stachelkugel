var menu;

function init_menu(){
	menu = document.getElementById("menu");
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
}

function show_menu(event){
	menu.style.visibility = "visible";
	menu.style.left = event.clientX;
	menu.style.top = event.clientY;
}

function hide_menu(){
	menu.style.visibility = "hidden";
}