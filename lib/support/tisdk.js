/******************************************
 * Modules included in this package
 *****************************************/
var fs = require('fs'),
    support = require('../support'),
    colors = require('colors'),
    conf = require('./config').getConfig(),
    exec = require('child_process').exec,
    path = require('path'),
    ProgressBar = require('progress');

/******************************************
 * Private Vars
 *****************************************/
var cwd = process.cwd();
var maxVersion;

/******************************************
 * Private Methods
 *****************************************/
function getMaxVersion() {
    var files = fs.readdirSync(conf.mobileSdkRoot);

    var dirs_in = [];
    function sep(element, index, array) {
        try
        {
            if( fs.statSync( path.join(conf.mobileSdkRoot +'/'+ element) ).isDirectory() && parseFloat(element) ) {
                dirs_in.push(element);
            }
        } catch(e) {
            console.log(e);
        }
    }
    files.forEach(sep);

    return dirs_in.sort().reverse()[0];
}

/******************************************
 * Public Vars
 *****************************************/
exports.maxVersion = maxVersion || getMaxVersion();

/******************************************
 * Public Methods
 *****************************************/
exports.exists = function(version) {
    try
    {
        fs.statSync(conf.mobileSdkRoot +'/'+ version);
        return true;
    }
    catch (e)
    {
        return false;
    }
};

exports.runScript = function(cmd, v) {
    var child = exec(cmd),
        verbose = v || false,
        pauseOutput = false,
        iv,
        progress = 0,
        bar,
        error = false,
        booted = false;

    function startProgress() {
        bar = new ProgressBar('Rebuilding progress: [:bar] :percent', { total: 20 });
        iv = setInterval(function () {
            if(progress < 19 && !error) {
                progress = progress+1;
                bar.tick();
            }

            if (booted || error) {

                // We setTimeout to give time for the error buffer to clear...
                setTimeout(function() {
                    process.exit();
                }, 300);
                clearInterval(iv);
            }
        }, 400);
    }

    child.stdout.on('data', function (data) {

        lines = data.split(/\r\n|\r|\n/);

        for(i=0; i<lines.length; i++) {

            if(lines[i] !== '') {
                if(lines[i].indexOf("SystemExit: 65") != -1 ) {
                    clearInterval(iv);
                    console.log("\n");
                    support.error('There was an error compialing your application, and Xcode did not provide the full error. Please run your project directly from Xcode to see the error...');
                } else if(!verbose && (lines[i].indexOf("processing") != -1 || lines[i].indexOf("linking") != -1 || lines[i].indexOf("Performing full rebuild") != -1) ) {
                    if(bar === undefined && iv === undefined) {
                        pauseOutput = true;
                        startProgress();
                    } else if(pauseOutput === false) {
                        support.colorizeConsole(lines[i], verbose);
                        console.log("");
                    }

                } else if(lines[i].indexOf("application booted") != -1 ) {
                    booted = true;
                    if(bar !== undefined) {
                        bar.tick(20 - progress);
                        pauseOutput = false;
                        console.log("\n");
                        support.colorizeConsole(lines[i], verbose);
                        console.log("");
                    }
                } else if(!pauseOutput){
                    support.colorizeConsole(lines[i], verbose);
                }

            }
        }

    });

    child.stderr.on('data', function (data) {
        error = true;

        console.log("");
        console.log(data.red);
    });

    child.on('exit', function (code) {
      return code;
    });
};
