var overlay	= $('[data-overlay]');
var parent	= $('[data-popup]');
var content	= $('[data-popup-content]');
var titleEl	= parent.find('h1');
var subEl	= parent.find('p');
var codeEl = parent.find('code');
var bodyEl = parent.find('p');
var formEl	= parent.find('form');

const overlayActiveClass = 'active-popup';
var popup = {

	show(){
		overlay.addClass(overlayActiveClass);
		parent.addClass('active');
		content.find('input[type=text]').first().trigger('focus');
	},

	hide(keepOverlay){
		if (keepOverlay !== 'keep overlay') overlay.removeClass(overlayActiveClass);
		parent.removeClass('active');
    	titleEl.removeClass('error');
		titleEl.empty();
		subEl.empty();
    	subEl.removeClass('error');
    	codeEl.empty();
    	bodyEl.empty();
		formEl.empty();
	},

	overlay(){
		overlay.toggleClass(overlayActiveClass);
	},

	initWithStrings(strings) {
		popup.hide();
		if(strings.title)
			popup.title(strings.title);
		if(strings.body)
			popup.body('a<br />\nb<br />\n' + strings.body);
		if(strings.text)
			popup.subtitle(strings.text);
		if(strings.code)
			popup.code(strings.code);
	},
	// shorthands for common popup configurations.
	// strings may have fields: title, text(subtitle), code, body, button, cancel

	// A popup with two buttons - Submit and Cancel
	// Builds the popup with the initWithStrings() function, then adds the two button callbacks.
	twoButtons(strings, onSubmit, onCancel) {
		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="submit" class="button popup-save">' + strings.button + '</button>');
		form.push('<button type="button" class="button cancel">' + strings.cancel + '</button>');

		popup.form.empty().append(form.join('')).off('submit').on('submit', (e) => {
			popup.hide();
			onSubmit(e);
		});
		popup.find('.cancel').on('click', () => {
			popup.hide();
			onCancel();
		});
		popup.show();
	},

	// For popups with only one button that needs to fire an event when clicked (eg, confirmation)
	// To work a strings.button string must be present in the strings object that's passed in
	oneButton(strings, onCancel) {
		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="cancel" class="button popup-save">' + strings.button + '</button>');
		popup.form.empty().append(form.join('')).find('.popup-save').on('click', () => {
			popup.hide();
			onCancel();
		});
		popup.show();	
	},

	// a popup with one button which will hide itself upon click
	// To change the text on the button pass in strings.button to the strings object
	ok(strings) {
		this.initWithStrings(strings);
		var button;
		if(strings.button)
			button = strings.button;
		else
			button = "OK";

		var form = [];
		form.push('<button type="submit" class="button popup cancel">' + button + '</button>');
		popup.form.empty().append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			popup.hide();
		});
		popup.show();
		popup.find('.cancel').trigger('focus');
	},

	find: selector => content.find(selector),

	title: text => titleEl.text(text),
	subtitle: text => subEl.text(text),
  	code: html => codeEl.html(html),
  	body: text => bodyEl.text(text),
	formEl: html => formEl.html(html),

	append: child => content.append(child),

	form: formEl,

	exampleChanged: example

};

module.exports = popup;

function example(cb, arg, delay, cancelCb){

	// build the popup content
	popup.title('Save your changes?');
	popup.subtitle('Warning: Any unsaved changes will be lost');
    popup.body('You have made changes to an example project. If you continue, your changes will be lost. To keep your changes, click cancel and then Save As in the project manager tab');
	var form = [];
	form.push('<button type="submit" class="button popup confirm">Continue</button>');
	form.push('<button type="button" class="button popup cancel">Cancel</button>');

	popup.form.append(form.join('')).off('submit').on('submit', e => {
		e.preventDefault();
		setTimeout(function(){
			cb(arg);
		}, delay);
		popup.hide();
	});

	popup.find('.cancel').on('click', () => {
		popup.hide();
		if (cancelCb) cancelCb();
	});

	popup.show();

	popup.find('.confirm').trigger('focus');

}
