(function(w){

var TPDB = function (){
	this.dbName = 'tagPlacesDB';
	this.notesTable = 'notes';
};

TPDB.prototype.Init = function (cb){
	cb = cb || function(){};
	var self = this;
	db.open( {
	    server: this.dbName,
	    version: 1,
	    schema: {
	        notes: {
	            key: { keyPath: 'lid' , autoIncrement: true },
	            indexes: {
                'by_position': { 
									key: ['position.lat','position.lon'],
									unique: false 
								},
							}
	        }
	    }
	}).done( function ( s ) {
	    self.db = s;
			cb(null,s);
	}).fail(function(err,a,b){
			cb(err,null);
	});

}

TPDB.prototype.destroy = function(cb){
	if(this.db){
		this.db.close();
		delete this.db;
	}
	cb = cb || function(){};
	
	var dbreq = indexedDB.deleteDatabase(this.dbName);
	dbreq.onsuccess = function (event) {
	}
	dbreq.onerror = function (event) {
		console.log(e);
	}	
}

TPDB.prototype.Insert = function (obj, pos, cb){
	if(pos){
		obj.position = pos;
	}
	cb = cb || function(){};
	this.db.add(this.notesTable,obj).done(function(item){
		cb(null,item);
	}).fail(function(err){
		cb(err,null);
	});
}

TPDB.prototype.Delete = function (lid, cb){
	cb = cb || function(){};
	this.db.remove(this.notesTable,lid).done(function(item){
		cb(null,item);
	}).fail(function(err){
		cb(err,null);
	});
}

TPDB.prototype.R = 6371000;  // earth's mean radius, m

TPDB.prototype.getCircleBoundingBox = function (pos, radius){
	// algorithm taken from http://www.movable-type.co.uk/scripts/latlong-db.html
	var box  = {};
	
	// get lattitude R in radians;
	var latR = (radius/this.R);
	// convert to degrees
	latR = (latR / Math.PI) * 180;;
  
	box.maxLat = pos.lat + latR;
  box.minLat = pos.lat - latR;
	
	var latRad = ((pos.lat / 180.0) * Math.PI)
	// get longitude R in radians;
	var lonR = radius/this.R/Math.cos(latRad);
	// convert to degrees
	lonR = (lonR / Math.PI) * 180;;
	
  box.maxLon = pos.lon + lonR;
  box.minLon = pos.lon - lonR;
	return box;
}

TPDB.prototype.List = function (pos, radius, cb){
	cb = cb || function(){};
	var bbox;
	if(pos && radius>0){
		bbox = this.getCircleBoundingBox(pos, radius);
	}
  var q;
	var self=this;
	if(bbox){
		q = this.db.query(this.notesTable,'by_position')
					.bound([bbox.minLat, bbox.minLon], [bbox.maxLat, bbox.maxLon])
					.filter(function(item){
						// convert both lat, lon to radians
						var lat1 = ((pos.lat / 180.0) * Math.PI);
						var lat2 = ((item.position.lat / 180.0) * Math.PI);

						var lon1 = ((pos.lon / 180.0) * Math.PI);
						var lon2 = ((item.position.lon / 180.0) * Math.PI);

						// calculate the distance
						var d = Math.acos(Math.sin(lat1)*Math.sin(lat2) + Math.cos(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1))*self.R;
						return d<=radius;
					});
	}else{
		q = this.db.query(this.notesTable).all();
	}
  q.execute()
		.done( function ( results ) {
		 cb(null,results)
		}).fail(function ( err) {
		 cb(err,null)
		});
}

w.TPDB=TPDB;

})(window);