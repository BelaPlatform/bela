// replace most non alpha-numeric chars with '_'
module.exports.sanitise = function (name, options){
	var isPath = false;
	if(options && options.isPath)
		isPath = options.isPath;
	var newName = name.replace(/[^a-zA-Z0-9\.\-\+\%\_\/~]/g, '_');
	// if this is a folder or file name (and not a path), then we do not allow '/'
	if(!isPath)
		newName = newName.replace(/[\/]/g, '_');
	console.log("FROM: ", name, "SANITISED: ", newName);
	return newName;
}

module.exports.formatString = function (format, vargs) {
	var args = Array.prototype.slice.call(arguments, 1);
	return format.replace(/{(\d+)}/g, function(match, number) {
	  return typeof args[number] != 'undefined'
		? args[number]
		: match ;
	});
}

// add onClick events for accordion functionality to relevant elements of the
// provided elements
module.exports.addAccordionEvent = function(elements) {
	if(!elements)
		elements = $("*");
	elements = elements.filter('[data-accordion-for]:not([data-accordion-ready])');
	elements.on('click', function() {
		var that = $(this);
		var parent = $('[data-tab=' + $(this)[0].dataset.parent + ']');
		var source = $(this).data('accordion-for');
		$(parent).find('[data-accordion]').each(function() {
			var target = $(this).data('accordion');
			if (target === source) {
				if (that.hasClass('active')) {
					that.removeClass('active');
					$(this).removeClass('show');
				} else {
					that.addClass('active');
					$(this).addClass('show');
				}
			}
		});
	});
	elements.attr('data-accordion-ready', "");
}

// dropdowns
module.exports.addDropdownEvent = function (elements){
	if(!elements)
		elements = $("*");
	elements.filter('[data-dropdown-for]').on('click', function() {
		var source = $(this).data('dropdown-for');
		$('[data-dropdown]').each(function() {
			var target = $(this).data('dropdown');
			if (target === source) {
				$(this).addClass('show');
			}
		});
	});
	// Close the dropdown menu if the user clicks outside of it
	window.onclick = function(event) {
		if (!event.target.matches('[data-dropdown-for]') && !event.target.matches('[data-dropdown] *')) {
			$('[data-dropdown]').removeClass('show')
		}
	}
}
