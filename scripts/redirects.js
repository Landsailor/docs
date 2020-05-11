// Handles generating HTML redirect pages for old links
var redirect = require('metalsmith-redirect');
var fs = require('fs');
var path = require('path');

module.exports = function plugin(options) {
	return function(files, metalsmith, done) {
		var configPath = metalsmith.path(options.config);
		var redirectList = JSON.parse(fs.readFileSync(configPath));
		
		// Save in the global metadata
		var metadata = metalsmith.metadata();
		metadata.redirectList = redirectList;

		// delegate to the plugin
		var redirectPlugin = redirect(redirectList);

		var redirectsRE = /redirects *: *true/;
		var allDevices = ['photon','electron','core','raspberry-pi','xenon','argon','boron','tracker-som'];
		
		// Auto-generate redirects for core, photon, electron, etc. if the destination specifies the device
		var toAdd = [];
		for(var oldLink in redirectList) {
			if (redirectList.hasOwnProperty(oldLink)) {
				var newLink = redirectList[oldLink];
				
				// ---
				// title: Device OS API
				// layout: reference.hbs
				// columns: three
				// devices: [photon,electron,core,raspberry-pi,xenon,argon,boron]
				// order: 20
				// ---
				
				// When removing a devices selector, its good to add in its place:
				// redirects: true
				// This will cause the redirects to be generated with the device to the page
				// without the device so the links won't be broken if one was saved with
				// the device present
				
				var path = metalsmith.path('../src/content' + newLink + '.md');
				if (fs.existsSync(path)) {
					var header = fs.readFileSync(path, 'utf8');
					
					header = header.substring(0, 1000);
					var end = header.indexOf('---', 10);
					if (end > 0) {
						header = header.substr(0, end + 3);
						var devicesStart = header.indexOf('devices:');
						if (devicesStart) {
							var left = header.indexOf('[', devicesStart);
							if (left >= 0) {
								var right = header.indexOf(']', left);
								if (right >= 0) {
									var devices = header.substring(left + 1, right).trim().split(',');
									for(var ii = 0; ii < devices.length; ii++) {
										var device = devices[ii].trim();
										toAdd.push({oldLink:oldLink + '/' + device, newLink:newLink + '/' + device});
									}
								}
							}
						}
						if (redirectsRE.test(header)) {
							// For old URL
							for(var ii = 0; ii < allDevices.length; ii++) {
								toAdd.push({oldLink:oldLink + '/' + allDevices[ii], newLink:newLink});
							}						
							// For current URL
							for(var ii = 0; ii < allDevices.length; ii++) {
								toAdd.push({oldLink:newLink + '/' + allDevices[ii], newLink:newLink});
							}						
						}
					}
				}
			}
		}
		for(var ii = 0; ii < toAdd.length; ii++) {
			obj = toAdd[ii];
			redirectList[obj.oldLink] = obj.newLink;
			// console.log('adding "' + obj.oldLink + '" -> "' + obj.newLink + '"');
		}
					
		redirectPlugin(files, metalsmith, done);
	};
};
