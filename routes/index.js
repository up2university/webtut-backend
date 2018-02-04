module.exports = function(params) {
  index = function(req, res)
  {
    var app = params.app,
        path = params.path;
    
    console.log("Processing: " + path);        
    var api = require('./api')( { app: app, path : path } );
    app.use(path + '/api', api.index);
  }
  
  return { index : index }
}