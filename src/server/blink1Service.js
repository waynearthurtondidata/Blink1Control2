/**
 *
 */

"use strict";

var _ = require('lodash');

// var doUsbDetect = false;

var Blink1 = require('node-blink1');
var usbDetect = null;
// if( doUsbDetect ) { usbDetect = require('usb-detection'); }

var tinycolor = require('tinycolor2');

var config = require('../configuration');

var log = require('../logger');
var util = require('../utils');

// globals because we are a singleton
var listeners = {};
var blink1serials = []; // no, use hash? Blink1.devices();

var blink1 = null;
var blink1OpenedSerial;
// var blink1Vid = 0x27B8;
// var blink1Pid = 0x01ED;

//var currentColor = colorparse('#ff00ff');
// array of colors, one per LED of blink1.
var currentColors = new Array( 18 ); // FIXME: 18 LEDs in current blink1 firmware
var currentMillis = 100;
var currentLedN = 0;
var lastColors = new Array(18);

lastColors.fill( tinycolor('#000000') ); // FIXME: hack
currentColors.fill( tinycolor('#000000') );

// var doDeviceRescan = config.readSettings("blink1Service:deviceRescan");

var Blink1Service = {
	toyEnable: false,
	toyTimer:null,
	conf: {},
	start: function() {
		listeners = {}; // erase previous listeners
		Blink1Service.scanForDevices();
	},
	reloadConfig: function() {
		log.msg("Blink1Service.reloadConfig");
		Blink1Service._removeAllDevices();
		// blink1serials = []; // hmmm
		// if( blink1 ) { blink1.close(); blink1 = null; }
		Blink1Service.scanForDevices();
	},
	scanForDevices: function() {
		log.msg("Blink1Service","blink1serials:", blink1serials);
		// initial population of any already-plugged in devices
		this.conf = config.readSettings('blink1Service');
		var serials = Blink1.devices();
		serials.map( function(s) {
			Blink1Service._addDevice(s);
		});

		log.msg("Blink1Service.scanForDevices: done. serials:", blink1serials);
		if( !usbDetect ) {
			if( blink1serials.length === 0 ) { // look for insertion events
				if( this.conf.deviceRescan ) {
					setTimeout( this.scanForDevices.bind(this), 5000);  // in 5 secs look again
				}
			}
			return;
		}
		/*
		// -- USB detection api
		// https://github.com/MadLittleMods/node-usb-detection
		usbDetect.on('add', function(device) {
			console.log('add', JSON.stringify(device), device);
			var vid = device.vendorId;
			var pid = device.productId;
			var serialnumber = device.serialNumber;
			if( vid === blink1Vid && pid === blink1Pid ) {
				//console.log('Blink1ServerApi.deviceListener, added', vid, pid, serialnumber);
				Blink1Service._addDevice( serialnumber );
			}
		});
		usbDetect.on('remove', function(device) {
			//console.log('remove', device);
			var vid = device.vendorId;
			var pid = device.productId;
			var serialnumber = device.serialNumber;
			if( vid === blink1Vid && pid === blink1Pid ) {
				Blink1Service._removeDevice( serialnumber );
			}
		});
		*/
	},
	// FIXME:
	closeAll: function() {
		log.msg("Blink1Service","closeAll WHO CALLS THIS");
		// if( usbDetect ) { usbDetect.stopMonitoring(); }
		// if( blink1 ) {
		// 	blink1.off();
		// 	// blink1.close();
		// }
		// blink1serials.map( Blink1Service._removeDevice );
		//this.removeAllListeners();
	},

	_addDevice: function(serialnumber) {
		log.msg("Blink1Service._addDevice: current serials:", blink1serials );
		if( blink1serials.indexOf(serialnumber) === -1 ) { // if blink1 not already in array // FIXME:
			log.msg("Blink1Service._addDevice: new serial ", serialnumber);
			blink1serials.push(serialnumber);
			if( this.conf.blink1ToUse === 0 || this.conf.blink1ToUse === serialnumber ) {
				setTimeout(function() {
					Blink1Service._setupDevice(serialnumber);  // FIXME: remove
				}, 500);
			}
		}
	},
	_removeDevice: function(serialnumber) {
		log.msg("Blink1Service","_removeDevice: current serials:", blink1serials);
		var i = blink1serials.indexOf(serialnumber);
		if( i > -1 ) {  // FIXME: this seems hacky
			blink1serials.splice(i, 1);
		}
		if( blink1 ) {
			log.msg('Blink1Service._removeDevice: closing blink1');
			blink1.close();
			blink1 = null;
			Blink1Service.notifyChange();
		}
		if( blink1serials.length === 0 ) {
			setTimeout( this.scanForDevices.bind(this), 5000);
		}
		log.msg('Blink1Service._removeDevice: new current serials:', blink1serials);
	},
	_closeCurrentDevice: function()	{
		log.msg('Blink1Service._closeCurrentDevice: closing blink1');
		if( blink1 ) {
			blink1.close();
			blink1 = null;
		}
	},
	_removeAllDevices: function() {
		log.msg("Blink1Service._removeAllDevices");
		// blink1serials.map( Blink1Service._removeDeviceDumb );
		blink1serials = []; // FIXME:
		Blink1Service._closeCurrentDevice();
		log.msg("Blink1Service._removeAllDevices: serials:",blink1serials);
	},
	_setupDevice: function(serialnumber) {
		log.msg("Blink1Service._setupDevice:",serialnumber);
		if( !blink1 ) {
			log.msg("Blink1Service._setupDevice: no blink1, so opening ",serialnumber);
			blink1 = new Blink1(serialnumber);
			blink1OpenedSerial = serialnumber;
			Blink1Service.notifyChange();
		}
	},

	// private function, accesses hardware
	_fadeToRGB: function( millis, r, g, b, n ) {
		if( blink1 ) {
			try {
				blink1.fadeToRGB( millis, r, g, b, n );
			} catch(err) {
				log.msg('Blink1Service', 'error', err);
				this._removeDevice(blink1OpenedSerial);
			}
		}
		// else { console.log("Blink1Service._fadeToRGB: no blink1"); }
	},

	// begin public functions

	getAllSerials: function() {
		//blink1serials = Blink1.devices();
		return _.clone(blink1serials);
	},

	isConnected: function() {
		return (blink1serials.length > 0);
	},

	serialNumber: function() {
		if( this.isConnected() ) {
			return blink1serials[0];
		}
		return '';
	},
	serialNumberForDisplay: function() {
		if( this.isConnected() ) {
			return blink1serials[0];
		}
		return '-';
	},
	// FIXME: fix and call this blink1Id or something
	iftttKey: function() {  // FIXME:
		var s = this.serialNumber() || '00000000';
		var k = this.hostId() + s;
		return k;
	},
	hostId: function() {
		var id = config.readSettings('hostId');
		if( !id ) {
			id = util.generateRandomHostId();
			this.setHostId(id);
		}
		return id;
	},
	setHostId: function(id) {
		config.saveSettings( 'hostId', id);
		// this.notifyChange();
	},

	setCurrentLedN: function(n) {
		currentLedN = n;
	},
	getCurrentLedN: function() {
		return currentLedN;
	},
	setCurrentMillis: function(m) {
		currentMillis = m;
	},
	getCurrentMillis: function() {
		return currentMillis;
	},
	getCurrentColor: function() { // FIXME
		// console.log("Blink1Service.getCurrentColor: ", currentLedN);
		var ledn = (currentLedN>0) ? currentLedN-1 : currentLedN;
		return currentColors[ ledn ];
	},
	getCurrentColors: function() {
		return currentColors;
	},

	// main entry point for this service, sets currentColor & currentLedN
	// 'color' arg is a tinycolor() color or hextring ('#ff00ff')
	// if color is a hexstring, it will get converted to tinycolor
	fadeToColor: function( millis, color, ledn) {
		ledn = ledn || 0;
		currentLedN = ledn;
		currentMillis = millis;
		lastColors = _.clone(currentColors);
		// console.log("Blink1Service: color:",typeof color, color);
		if( typeof color === 'string' ) {
			color = tinycolor( color ); // FIXME: must be better way
		}
		// else if( !color.isValid() ) {
		//
		// }
		// FIXME: how to make sure 'color' is a tinycolor object? color.isValid?
		log.msg("Blink1Service","fadeToColor:", millis,ledn, color.toHexString());//, typeof color, (color instanceof String) );

		// handle special meaning: ledn=0 -> all LEDs
		if( ledn === 0 ) {
			currentColors.fill( color );
		} else {
		 	currentColors[ledn-1] = color;
		}
		var crgb = color.toRgb();
		this._fadeToRGB( millis, crgb.r, crgb.g, crgb.b, ledn);

		this.notifyChange();
	},

	off: function() {
		this.toyEnable = false;
		this.fadeToColor(0, '#000000', 0);
	},
	colorCycleStart: function() {
		this.toyEnable = true;
		this.colorCycleDo();
	},
	colorCycleStop: function() {
		this.toyEnable = false;
		clearTimeout( this.toyTimer );
	},
	colorCycleDo: function() {
		log.msg("Blink1Service.doColorCycle");
		if( !this.toyEnable ) { return; }
		this.fadeToColor( 100, tinycolor.random(), 0 );
		this.toyTimer = setTimeout(this.colorCycleDo.bind(this), 300);
	},

	addChangeListener: function(callback, callername) {
		listeners[callername] = callback;
		// console.log("Blink1Service: addChangelistener", listeners );
	},
	removeChangeListener: function(callername) {
		log.msg("Blink1Service","removeChangelistener: removing", callername);
		delete listeners[callername];
		log.msg("Blink1Service","removeChangelistener", listeners );
	},
	removeAllListeners: function() {
		_.keys( listeners, function(callername) {
			this.removeChangelistener(callername);
		});
	},
	notifyChange: function() {
		_.forIn( listeners, function(callback) {
			// currentColor and currentColors are tinycolor objects
			callback( Blink1Service.getCurrentColor(), currentColors, currentLedN, currentMillis);
		});
	},


};


module.exports = Blink1Service;