function isInt(value) {
  return !isNaN(value) && 
         parseInt(Number(value)) == value && 
         !isNaN(parseInt(value, 10));
}

module.exports = function(params) {
  var sequelize = params.sequelize;
  
  index = function(req, res){
  
    var mode = req.query.mode;
    var group = req.query.group;
    
    var SQL = "SELECT *";
    
    if (mode == "count") {
      SQL = "SELECT count(*) as count";
    }

    if (group) {
      SQL += ", " + group;
    }

    SQL += " FROM ";    
    var table = req.params.table;
    var id = req.params.id;
    
    SQL = SQL + table;
    if (isInt(id)) {
      SQL = SQL + " WHERE id = " + id;
    } 

    if (group) {
      SQL += " GROUP BY " + group;
    }
    
    console.log(req.route.path);
    
    sequelize.query(SQL).then(function(rows) {
      res.format({
        json: function() {
          res.send({result : rows[0], error : false});
        }
      });
      // res.jsonp(rows);
    }).error(function(error) {
      console.log(error);
    });
  };
  
  return { index : index };
};

