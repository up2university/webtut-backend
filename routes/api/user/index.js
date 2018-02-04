
module.exports = function(params) {
  var sequelize = params.sequelize;
  
  index = function(req, res){
    console.log("Routes Successfully");
    sequelize.query("SELECT * FROM user").then(function(rows) {
      res.format({
        json: function() {
          res.send({result : rows, error : false});
        }
      });
      // res.jsonp(rows);
    }).error(function(error) {
      console.log(error);
    });
  };
  
  return { index : index };
};

