#! /usr/bin/env node

var userArgs = process.argv.slice(2);

var fs = require('fs'),
    path = require('path');

var DynamiteCLI = {

    parseArgs:function(args) {

        var parsed = {};

        for(var arg in args) {

            //match = args
            if(args[arg].indexOf('=') > 0) {
                var split = args[arg].split('=');
                parsed[split[0].replace('--', '')] = split[1];
            }else {
                parsed[args[arg]] = true;
            }

        }

        return parsed;

    },

    init:function(args) {

        var method = args[0];

        //remove method from args
        args.shift();

        if(!method) {
            console.error('You didn\'t pass a function: e.g dynamite configure');
            return;
        }

        this[method](this.parseArgs(args));

    },

    //injects dynamite modules dependencies into app's package.json
    modules:function() {

        var devDependencies = {},
            dependencies = {};

        var dir = process.cwd();

        //first get app's package.json
        var appPackageFile = path.join(dir, 'package.json');

        if(!fs.existsSync(appPackageFile)) {
            console.error('Dude, there\'res no package.json file in the same dir as you\'re calling me from.');
            return;
        }

        fs.readFile(appPackageFile, {encoding: 'utf-8'}, function(err, appPackageData){

            appPackageData = JSON.parse(appPackageData);

            if(err){
                console.error(err);
            }

            if(appPackageData.devDependencies) {
                devDependencies = appPackageData.devDependencies;
            }

            if(appPackageData.dependencies) {
                dependencies = appPackageData.dependencies;
            }

            var configFile = path.join(dir, 'dynamite.json');

            if(!fs.existsSync(configFile)) {
                console.error('Dude, there\'res no dynamite.json file present.');
                return;
            }

            fs.readFile(configFile, {encoding: 'utf-8'}, function(err,data){

                if(err) {
                    console.error(err);
                    return;
                }

                var data = JSON.parse(data);

                if(!data.modules || !data.modules.length) {
                    console.error('Dude, there\'es no modules activated in your dynamite.json file.');
                }

                for(var module in data.modules) {

                    var packageFile = path.join(dir, 'dynamite/js/modules/'+data.modules[module]+'/package.json');

                    if(!fs.existsSync(packageFile)) {
                        console.error('Dude, there\'res no package.json file in your dynamite module.');
                        return;
                    }

                    fs.readFile(packageFile, {encoding: 'utf-8'}, function(err, packageData){

                        if(err) {
                            console.error(err);
                        }

                        packageData = JSON.parse(packageData);

                        var added = {
                           devDependencies:[],
                           dependencies:[],
                           devDependenciesCount:0,
                           dependenciesCount:0
                        };

                        if(packageData.devDependencies) {
                            for(var i in packageData.devDependencies) {
                                if(!devDependencies[i]) {
                                    devDependencies[i] = packageData.devDependencies[i];
                                    added.devDependencies.push(i);
                                }
                            }
                        }

                        if(packageData.dependencies) {
                            for(var i in packageData.dependencies) {
                                if(!dependencies[i]) {
                                    dependencies[i] = packageData.dependencies[i];
                                    added.dependencies.push(i);
                                }
                            }
                        }

                        added.dependenciesCount = added.dependencies.length;
                        added.devDependenciesCount = added.dependencies.length;

                        appPackageData.dependencies = dependencies;
                        appPackageData.devDependencies = devDependencies;

                        fs.writeFile(appPackageFile, JSON.stringify(appPackageData, null, "\t"), function(err) {

                            if(err) {
                                console.log(err);
                            }

                            if(added.devDependenciesCount + added.dependenciesCount < 1) {
                                console.log('All of '+data.modules[module]+"'s dependencies are already included in your package.json");
                                return;
                            }

                            var message = "Success Muchacho. package.json updated with "+data.modules[module]+"'s dependencies \n\n";

                            message += added.devDependenciesCount+ " devDependency";

                            if(added.devDependenciesCount > 0) {
                                message += ": "+added.devDependencies+"\n";
                            }else {
                                message += "\n";
                            }

                            message += added.dependenciesCount+ " dependency";

                            if(added.dependenciesCount > 0) {
                                message += ": "+added.dependencies;
                            }

                            console.log(message);

                        });

                    });

                }

            });

        });

    },

    configure:function(args) {

        //path to project specific configuration
        var path = (args.path)
                        ? args.path
                        : 'dynamite/config/';

        var dest = 'node_modules/dynamite';

        var tmp = 'fdyf498r4fdynTemp/';

        rimraf(tmp, function (err) {

            exec('mkdir '+tmp, function() {

                copydir('node_modules/dynamite', tmp, function(err) {

                    copydir(path, tmp, function() {

                        exec('npm --prefix '+tmp+' install '+tmp, function() {

                            exec('grunt --gruntfile=tmp/GruntFile.js', function() {

                                //copy the javascript file / min file to users dir
                                var files = [
                                  'dynamite-0.1.0.js',
                                  'dynamite-0.1.0.min.js',
                                  'dynamite-0.1.0.css'
                                ];

                                for(var file in files) {
                                    mv(tmp+'/'+file, file);
                                }

                            })

                        });

                    });

                });

            });

        });

    }


};

DynamiteCLI.init(userArgs);

