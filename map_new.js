var map,
	infoWindow,
	markers = [],
	marker = 1,
	polygon = 1,
	polygons = [],
	circle = 1,
	polygonIntersection = false,
	circles = [],
	circleIntersect = false,
	circleIntersectPolygon = false,
	polygonIntersectCircle = false,
	isMarkerExists = false,
	myLatLng = null,
	defaultPosition = {
		lat: 23.8103,
		lng: 90.4125,
	};
(radiusSlider = document.getElementById("radiusSliderRange")),
	(radiusInput = document.getElementById("circle_radius_input"));

async function createMap(position = null) {
	//initializing infoWindow
	infoWindow = new google.maps.InfoWindow({});

	//contains method in circle
	google.maps.Circle.prototype.contains = function (latLng) {
		return (
			this.getBounds().contains(latLng) &&
			google.maps.geometry.spherical.computeDistanceBetween(
				this.getCenter(),
				latLng
			) <= this.getRadius()
		);
	};

	//polygon method
	google.maps.Polygon.prototype.getBoundingBox = function () {
		var bounds = new google.maps.LatLngBounds();

		this.getPath().forEach(function (element, index) {
			bounds.extend(element);
		});

		return bounds;
	};

	google.maps.Polygon.prototype.getApproximateCenter = function () {
		var boundsHeight = 0,
			boundsWidth = 0,
			centerPoint,
			heightIncr = 0,
			maxSearchLoops,
			maxSearchSteps = 10,
			n = 1,
			northWest,
			polygonBounds = this.getBoundingBox(),
			testPos,
			widthIncr = 0;

		// Get polygon Centroid
		centerPoint = polygonBounds.getCenter();

		if (google.maps.geometry.poly.containsLocation(centerPoint, this)) {
			// Nothing to do Centroid is in polygon use it as is
			return centerPoint;
		} else {
			maxSearchLoops = maxSearchSteps / 2;

			// Calculate NorthWest point so we can work out height of polygon NW->SE
			northWest = new google.maps.LatLng(
				polygonBounds.getNorthEast().lat(),
				polygonBounds.getSouthWest().lng()
			);

			// Work out how tall and wide the bounds are and what our search
			// increment will be
			boundsHeight =
				google.maps.geometry.spherical.computeDistanceBetween(
					northWest,
					polygonBounds.getSouthWest()
				);
			heightIncr = boundsHeight / maxSearchSteps;

			boundsWidth = google.maps.geometry.spherical.computeDistanceBetween(
				northWest,
				polygonBounds.getNorthEast()
			);
			widthIncr = boundsWidth / maxSearchSteps;

			// Expand out from Centroid and find a point within polygon at
			// 0, 90, 180, 270 degrees
			for (; n <= maxSearchSteps; n++) {
				// Test point North of Centroid
				testPos = google.maps.geometry.spherical.computeOffset(
					centerPoint,
					heightIncr * n,
					0
				);
				if (google.maps.geometry.poly.containsLocation(testPos, this)) {
					break;
				}

				// Test point East of Centroid
				testPos = google.maps.geometry.spherical.computeOffset(
					centerPoint,
					widthIncr * n,
					90
				);
				if (google.maps.geometry.poly.containsLocation(testPos, this)) {
					break;
				}

				// Test point South of Centroid
				testPos = google.maps.geometry.spherical.computeOffset(
					centerPoint,
					heightIncr * n,
					180
				);
				if (google.maps.geometry.poly.containsLocation(testPos, this)) {
					break;
				}

				// Test point West of Centroid
				testPos = google.maps.geometry.spherical.computeOffset(
					centerPoint,
					widthIncr * n,
					270
				);
				if (google.maps.geometry.poly.containsLocation(testPos, this)) {
					break;
				}
			}

			return testPos;
		}
	};

	//start create a map
	// myLatLng = await getLatLang();
	myLatLng = position == null ? defaultPosition : position;
	var options = {
		center: myLatLng,
		zoom: 12,
	};
	map = new google.maps.Map(document.getElementById("map"), options);
	//end create a map

	marker = new google.maps.Marker({});
	circle = new google.maps.Circle({});
	polygon = new google.maps.Polygon({});

	if (position != null) {
		marker.setMap(map);
		// marker.setTitle(p.name);
		marker.setPosition(position);
		marker.setAnimation(google.maps.Animation.DROP);
		marker.setDraggable(true);
		marker.setIcon("https://maps.google.com/mapfiles/ms/icons/red-dot.png");
		setPolygonOrCircle(checkType(areas));
	}

	setExistingArea(areas);

	// Searching places
	var input = document.getElementById("searchText");
	var searchBox = new google.maps.places.SearchBox(input);
	// var formDiv = document.getElementById("form-div");
	// map.controls[google.maps.ControlPosition.TOP_LEFT].push(formDiv);

	map.addListener("bounds_changed", function () {
		searchBox.setBounds(map.getBounds());
	});

	searchBox.addListener("places_changed", function () {
		var places = searchBox.getPlaces();
		if (places.length === 0) {
			return;
		}

		marker !== 1 && marker.setMap(null);
		polygon !== 1 && polygon.setMap(null);
		circle !== 1 && circle.setMap(null);
		var bounds = new google.maps.LatLngBounds();

		places.forEach(function (p) {
			if (!p.geometry) return;

			// check if marker exist on the place selected
			markers.forEach(function (Emarker) {
				if (isMarkerExists === false) {
					if (
						JSON.stringify(Emarker.getPosition().toJSON()) ===
						JSON.stringify(p.geometry.location.toJSON())
					) {
						toastr.error("Marker existed for this location", {
							timeOut: "2000",
						});
					}
				}
			});

			if (isMarkerExists === false) {
				marker.setMap(map);
				marker.setTitle(p.name);
				marker.setPosition(p.geometry.location);
				marker.setAnimation(google.maps.Animation.DROP);
				marker.setDraggable(true);
				marker.setIcon(
					"https://maps.google.com/mapfiles/ms/icons/red-dot.png"
				);

				//change marker icon color
				markers.forEach(function (marker) {
					marker.setIcon(
						"https://maps.google.com/mapfiles/ms/icons/green-dot.png"
					);
				});
			}

			if (p.geometry.viewport) {
				bounds.union(p.geometry.viewport);
			} else {
				bounds.extends(p.geometry.location);
			}

			map.fitBounds(bounds);
			map.setZoom(14);

			setPolygonOrCircle(checkType(areas));
		});
	});

	google.maps.event.addListener(marker, "dragend", function (event) {
		getCoordinateDetails(marker.getPosition().toJSON());
	});

	google.maps.event.addListener(marker, "drag", function (event) {
		getCoordinateDetails(marker.getPosition().toJSON());
		if (circle != 1) {
			circle.setCenter(marker.getPosition().toJSON());
		}
		// if (polygon != 1) {
		// 	let path = polygon.getPath();
		// 	let pathArr = logArray(path);
		// 	setPolygonOrCircle("zone", pathArr);
		// }
	});

	google.maps.event.addListener(circle, "drag", function (event) {
		// getCoordinateDetails(circle.getCenter().toJSON());
		marker.setPosition(circle.getCenter().toJSON());
	});
	google.maps.event.addListener(circle, "dragend", function (event) {
		getCoordinateDetails(circle.getCenter().toJSON());
		marker.setPosition(circle.getCenter().toJSON());
	});

	google.maps.event.addListener(polygon, "drag", function (event) {
		let center = polygon.getApproximateCenter();
		// getCoordinateDetails(center.toJSON());
		marker.setPosition(center.toJSON());
	});
	google.maps.event.addListener(polygon, "dragend", function (event) {
		let center = polygon.getApproximateCenter();
		getCoordinateDetails(center.toJSON());
		marker.setPosition(center.toJSON());
	});

	let closeBtn = document.getElementById("setMapCloseBtn");
	let resetBtn = document.getElementById("resetBtn");
	closeBtn.addEventListener("click", function (event) {
		reset();
	});
	resetBtn.addEventListener("click", function (event) {
		reset();
	});

	//show infoWindow
	// if (polygons.length > 0) {
	// 	markers.forEach(function (marker) {
	// 		google.maps.event.addListener(
	// 			marker,
	// 			"mouseover",
	// 			function (event) {
	// 				var contentString = `<div class="card-body">
    //                                 <div class="row d-flex">
    //                                     <strong>Name:</strong>
    //                                     <p>${marker.name}</p>
    //                                 </div>
    //                                 <div class="row d-flex">
    //                                     <strong>Charge:</strong>
    //                                     <p>${marker.charge} taka</p>
    //                                 </div>
    //                             </div>`;
	// 				infoWindow.setContent(contentString);
	// 				infoWindow.setPosition(marker.getPosition().toJSON());
	// 				infoWindow.open(map);
	// 			}
	// 		);

	// 		marker.addListener("mouseout", function () {
	// 			infoWindow.close(map);
	// 		});
	// 	});
	// } else {
	// 	markers.forEach(function (marker) {
	// 		google.maps.event.addListener(
	// 			marker,
	// 			"mouseover",
	// 			function (event) {
	// 				var contentString = `<div class="card-body">
    //                                 <div class="row d-flex">
    //                                     <strong>Name:</strong>
    //                                     <p class="mr-2">${marker.name}</p>
    //                                 </div>
    //                                 <div class="row d-flex">
    //                                     <strong>Charge:</strong>
    //                                     <p class="mr-2">${marker.charge} taka</p>
    //                                 </div>
    //                                 <div class="row d-flex">
    //                                     <strong>Radius:</strong>
    //                                     <p class="mr-2">${marker.radius} km</p>
    //                                 </div>
    //                             </div>`;
	// 				infoWindow.setContent(contentString);
	// 				infoWindow.setPosition(marker.getPosition().toJSON());
	// 				infoWindow.open(map);
	// 			}
	// 		);

	// 		marker.addListener("mouseout", function () {
	// 			infoWindow.close(map);
	// 		});
	// 	});
	// }

	//radius slider input oninput
	radiusSlider.addEventListener("input", function (event) {
		if (circle !== 1) {
			setCircleRadius(radiusSlider);
			circle.setRadius(parseInt(radiusSlider.value));
		}
	});

	//radius input oninput
	radiusInput.addEventListener("input", function (event) {
		if (circle !== 1) {
			radiusSlider.value = radiusInput.value * 1000;
			circle.setRadius(parseInt(radiusSlider.value));
		}
	});
}

const setCurrentLocation = async () => {
	let location = await getLatLang();
	createMap(location);
	getCoordinateDetails(location);
};

function submit() {
	let ok = true;
	let id = localStorage.getItem("delivery_area_id");
	let areaType = checkType(areas);
	let areaData = null;
	let type = null;
	let placeName = document.getElementById("searchText").value;
	let userPlaceName = document.getElementById("searchTextUser").value;
	let deliveryCharge = document.getElementById("deliveryCharge").value;
	let minimumOrderPrice =
		document.getElementsByName("minimumOrderPrice")[0].value;
	let minimumOrderQuantity = document.getElementsByName(
		"minimumOrderQuantity"
	)[0].value;

	if (localStorage.getItem("delivery_area_modal_type") === "add") {
		if (placeName === "") {
			toastr.error("Please enter a place name", {
				timeOut: "2000",
			});
		}
		ok = false;
	} else {
		ok = true;
	}

	if (deliveryCharge === "") {
		toastr.error("Please enter a delivery charge", {
			timeOut: "2000",
		});
		ok = false;
	} else {
		ok = true;
	}

	//check if polygons intersects
	// if (polygon !== 1) {
	//     newPolygons = []
	//     polygons.forEach((p) => {
	//       if (p.id != id) {
	//         newPolygons.push(p);
	//       }
	//     });
	//     if(polygon.id == id){
	//         polygonIntersection = checkPolygonIntersection(polygon, newPolygons);
	//         circleIntersectPolygon = checkCircleIntersectPolygon(
	//           polygon,
	//           circles,
	//           "zone"
	//         );
	//     } else {
	//         polygonIntersection = checkPolygonIntersection(polygon, polygons);
	//         circleIntersectPolygon = checkCircleIntersectPolygon(
	//             polygon,
	//             circles,
	//             "zone"
	//         );
	//     }
	//     if (polygonIntersection || circleIntersectPolygon) {
	//         toastr.error("Delivery area intersection detected, please modify the new area", {
	//           timeOut: "2000",
	//         });
	//     }
	// }

	//check if circles intersects
	// if (circle !== 1) {
	//     newCircles = []
	//     circles.forEach((c) => {
	//         if(c.id != id){
	//             newCircles.push(c)
	//         }
	//     })

	//     if(circle.id == id){
	//         circleIntersect = checkCircleIntersection(circle, newCircles);
	//         polygonIntersectCircle = checkCircleIntersectPolygon(
	//           circle,
	//           polygons,
	//           "radius"
	//         );
	//     } else {
	//         circleIntersect = checkCircleIntersection(circle, circles);
	//         polygonIntersectCircle = checkCircleIntersectPolygon(
	//             circle,
	//             polygons,
	//             "radius"
	//         );
	//     }
	//     if (circleIntersect || polygonIntersectCircle) {
	//         toastr.error(
	//           "Delivery area intersection detected, please modify the new area",
	//           {
	//             timeOut: "2000",
	//           }
	//         );
	//     }
	// }

	if (ok) {
		if (areaType === "zone") {
			if (marker.getPosition() !== undefined) {
				if (polygon !== 1) {
					type = "zone";
					data = logArray(polygon.getPath());

					areaData = {
						type,
						placeName,
						userPlaceName,
						deliveryCharge,
						minimumOrderPrice,
						minimumOrderQuantity,
						data: {
							center: marker.getPosition().toJSON(),
							vertices: logArray(polygon.getPath()),
						},
					};

					let inpolygon = setPolygonMarker(marker, polygon);
					if (!inpolygon) {
						toastr.error("Please drag the marker inside the area", {
							timeOut: "2000",
						});
					} else {
						type = localStorage.getItem("delivery_area_modal_type");
						if (type === "add") {
							addArea(areaData);
						} else {
							editArea(areaData);
						}
					}
				} else {
					toastr.error("Delivery area existed", {
						timeOut: "2000",
					});
				}
			} else {
				toastr.error("Marker no found", {
					timeOut: "2000",
				});
			}
		} else {
			if (marker.getPosition() !== undefined) {
				if (circle !== 1) {
					type = "radius";
					areaData = {
						type,
						placeName,
						userPlaceName,
						deliveryCharge,
						minimumOrderPrice,
						minimumOrderQuantity,
						data: {
							bounds: circle.getBounds()?.toJSON(),
							center: circle.getCenter().toJSON(),
							marker: marker.getPosition().toJSON(),
							radius: circle.getRadius(),
						},
					};

					let incircle = circle.contains(
						marker.getPosition().toJSON()
					);
					if (!incircle) {
						toastr.error(
							"Please drag marker close to the center of the circle",
							{
								timeOut: "2000",
							}
						);
					} else {
						type = localStorage.getItem("delivery_area_modal_type");
						if (type === "add") {
							addArea(areaData);
						} else {
							editArea(areaData);
						}
					}
				} else {
					toastr.error("Delivery area existed", {
						timeOut: "2000",
					});
				}
			} else {
				toastr.error("Marker not found", {
					timeOut: "2000",
				});
			}
		}
	}
}

function modifyCoordinatesLatLngToXY(coordinates) {
	let newCoordinates = [];
	coordinates.forEach((coord) => {
		let newCoord = {};
		newCoord.x = parseFloat(coord.lat);
		newCoord.y = parseFloat(coord.lng);
		newCoordinates.push(newCoord);
	});
	return newCoordinates;
}

function modifyCoordinatesXYToLatLng(coordinates) {
	let newCoordinates = [];
	coordinates.forEach((coord) => {
		let newCoord = {};
		newCoord.lat = parseFloat(coord.x);
		newCoord.lng = parseFloat(coord.y);
		newCoordinates.push(newCoord);
	});
	return newCoordinates;
}

function modifyPolygonVertices(coordinates) {
	let newCoordinates = [];
	coordinates.forEach((coord) => {
		let newCoord = {};
		newCoord.lat = parseFloat(coord.lat);
		newCoord.lng = parseFloat(coord.lng);
		newCoordinates.push(newCoord);
	});
	return newCoordinates;
}

function modifyPolygonCenter(coordinate) {
	let newCoord = {};
	newCoord.lat = parseFloat(coordinate.lat);
	newCoord.lng = parseFloat(coordinate.lng);
	return newCoord;
}

function modifyCoordinatesObjectToArray(coordinateObject) {
	let newCoordinates = [];
	coordinateObject.forEach((coord) => {
		let newCoord = [parseFloat(coord.lat), parseFloat(coord.lng)];
		newCoordinates.push(newCoord);
	});
	return newCoordinates;
}

function latLngModify(array) {
	let coords = {};
	(coords.lat = array[0]), (coords.lng = array[1]);
	return coords;
}

// polygon vertices
function logArray(array) {
	let vertices = [];
	for (var i = 0; i < array.getLength(); i++) {
		vertices.push({
			lat: array.getAt(i).lat(),
			lng: array.getAt(i).lng(),
		});
	}

	return vertices;
}

function checkPolygonIntersection(polygon1, polygonArray) {
	let result = false;
	polygonCoordinates1 = modifyCoordinatesLatLngToXY(
		logArray(polygon1.getPath())
	);
	polygonArray.forEach(function (polygon) {
		let array = intersect(
			modifyCoordinatesLatLngToXY(logArray(polygon.getPath())),
			polygonCoordinates1
		);
		if (array.length > 0) {
			result = array;
		}
	});
	return result;
}

function setPolygonMarker(marker, polygon) {
	mPosition = {
		x: marker.getPosition().toJSON().lat,
		y: marker.getPosition().toJSON().lng,
	};

	pVertices = modifyCoordinatesLatLngToXY(logArray(polygon.getPath()));
	let inPolygon = pointIsInPoly(mPosition, pVertices);

	return inPolygon;
}

function circleIntersection(circle0, circle1) {
	var center0 = circle0.getCenter();
	var center1 = circle1.getCenter();

	var maxDist = circle0.getRadius() + circle1.getRadius();
	var actualDist = google.maps.geometry.spherical.computeDistanceBetween(
		center0,
		center1
	);

	return maxDist >= actualDist;
}

function checkCircleIntersection(circle, circles) {
	let result = false;
	circles.forEach(function (c) {
		if (circleIntersection(circle, c)) {
			result = true;
		}
	});
	return result;
}

function checkCircleIntersectPolygon(cp, cps, type) {
	if (type === "zone") {
		let result = [];
		let pvs = modifyCoordinatesLatLngToXY(logArray(cp.getPath()));
		let cpvs = [];
		cps.forEach(function (circle) {
			let coordinates = [
				circle.getCenter().toJSON().lng,
				circle.getCenter().toJSON().lat,
			]; //[lon, lat]
			let radius = circle.getRadius();
			let options = { numberOfEdges: 64 };
			let cvs = circleToPolygon(coordinates, radius, options)
				.coordinates[0]; //converting circle to polygon and array of vertices
			cpvs.push(cvs);
		});
		cpvs.forEach(function (vs) {
			let array = intersect(modifyCoordinatesLatLngToXY(vs), pvs);
			if (array.length > 0) {
				result.push(array);
			}
		});

		if (result.length > 0) {
			return true;
		} else {
			return false;
		}
	} else {
		let result = [];
		let coordinates = [
			cp.getCenter().toJSON().lng,
			cp.getCenter().toJSON().lat,
		]; //[lon, lat]
		let radius = cp.getRadius();
		let options = { numberOfEdges: 64 };
		let cvs = modifyCoordinatesLatLngToXY(
			circleToPolygon(coordinates, radius, options).coordinates[0]
		); //converting circle to polygon and array of vertices
		let cpvs = [];
		cps.forEach(function (polygon) {
			let vertices = modifyCoordinatesLatLngToXY(
				logArray(polygon.getPath())
			);
			cpvs.push(vertices);
		});
		cpvs.forEach(function (vs) {
			let array = intersect(vs, cvs);
			if (array.length > 0) {
				result.push(array);
			}
		});
		if (result.length > 0) {
			return true;
		} else {
			return false;
		}
	}
}

function checkType() {
	return db_type;
}

function setPolygonOrCircle(type, vertices = null) {
	if (isMarkerExists === false) {
		if (type == "zone") {
			polygon !== 1 && polygon.setMap(null);
			let markerLat = marker.getPosition().lat();
			let markerLng = marker.getPosition().lng();
			let difference = 0.01;

			//ADDING EDITABLE POLYGONS
			var polygonCoordinates = [
				{ lat: markerLat - difference, lng: markerLng - difference },
				{ lat: markerLat + difference, lng: markerLng - difference },
				{ lat: markerLat + difference, lng: markerLng + difference },
				{ lat: markerLat - difference, lng: markerLng + difference },
			];

			// polygon = new google.maps.Polygon({
			// 	map,
			// 	paths: polygonCoordinates,
			// 	strokeColor: "red",
			// 	fillColor: "red",
			// 	fillOpacity: 0.4,
			// 	draggable: true,
			// 	editable: true,
			// });
			
			polygon.setMap(map);
			polygon.setPaths(polygonCoordinates);
			polygon.setDraggable(true)
			polygon.setEditable(true)
			polygon.setOptions({
				strokeColor: "red",
				fillColor: "red",
				fillOpacity: 0.4,
			});
			marker.setDraggable(false)
		} else {
			radiusVal = document.getElementById("circle_radius_input").value * 1000;
			circle !== 1 && circle.setMap(null);
			let markerLat = marker.getPosition().lat();
			let markerLng = marker.getPosition().lng();

			//ADDING EDITABLE CIRCLES
			// circle = new google.maps.Circle({
			// 	strokeColor: "red",
			// 	strokeOpacity: 0.8,
			// 	strokeWeight: 2,
			// 	fillColor: "red",
			// 	fillOpacity: 0.35,
			// 	map,
			// 	center: { lat: markerLat, lng: markerLng },
			// 	radius: parseInt(radiusVal),
			// 	draggable: true,
			// 	// editable: true,
			// });

			circle.setMap(map)
			circle.setCenter({ lat: markerLat, lng: markerLng });
			circle.setRadius(radiusVal)
			circle.setDraggable(true)
			circle.setOptions({
				strokeColor: "red",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				fillColor: "red",
				fillOpacity: 0.35,
			});
		}
	}
}

function reset() {
	let modal_type = localStorage.getItem("delivery_area_modal_type");
	map.setZoom(12);
	map.setCenter(myLatLng);
	document.getElementById("searchText").value = "";
	document.getElementById("deliveryCharge").value = "";
	document.getElementById("searchTextUser").value = "";
	document.getElementById("radiusSliderRange").value = 1000;
	document.getElementById("circle_radius_input").value = 1;
	document.getElementById("minimumOrderPrice").checked = false;
	document.getElementsByName("minimumOrderPrice")[0].disabled = true;
	document.getElementsByName("minimumOrderPrice")[0].value = null;
	document.getElementById("minimumOrderQuantity").checked = false;
	document.getElementsByName("minimumOrderQuantity")[0].disabled = false;
	document.getElementsByName("minimumOrderQuantity")[0].value = null;

	circle !== 1 && circle.setMap(null);
	polygon !== 1 && polygon.setMap(null);
	marker !== 1 && marker.setMap(null);

	if (modal_type === "edit") {
		toastr.error("To edit please reopen the modal");
		$("#deliveryAreaModal").modal("hide");
	}

	circles.forEach((c) => {
		c.setMap(null);
	});
	polygons.forEach((p) => {
		p.setMap(null);
	});
	markers.forEach((m) => {
		m.setMap(null);
	});
	setExistingArea(areas);
}

function setExistingArea(areas) {
	areas.forEach((element) => {
		if (element.data) {
			let type = element.type;
			let data = JSON.parse(element.data);

			//adding marker
			markers.push(
				new google.maps.Marker({
					map,
					title: element.name,
					icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
					position:
						element.type === "zone"
							? modifyPolygonCenter(data.center)
							: modifyPolygonCenter(data.marker),
					animation: google.maps.Animation.DROP,
					id: element.id,
					name: element.name,
					charge: element.delivery_charge,
					radius:
						element.type === "radius"
							? JSON.parse(element.data).radius / 1000
							: 0,
				})
			);

			if (type === "zone") {
				//adding polygon
				polygons.push(
					new google.maps.Polygon({
						map,
						paths: modifyPolygonVertices(data.vertices),
						strokeColor: "blue",
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: "blue",
						fillOpacity: 0.35,
						id: element.id,
						center: modifyPolygonCenter(data.center),
						name: element.name,
						delivery_charge: element.delivery_charge,
					})
				);
			} else {
				circles.push(
					new google.maps.Circle({
						strokeColor: "blue",
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: "blue",
						fillOpacity: 0.35,
						map,
						center: modifyPolygonCenter(data.marker),
						radius: parseFloat(data.radius),
						id: element.id,
						name: element.name,
						delivery_charge: element.delivery_charge,
					})
				);
			}
		}
	});
}
