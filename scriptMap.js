var map = L.map('map').setView([45.7, 3.15], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

var ventes;
var totalVentes = 0;
var clickedCommunes = [];

var communesLayer;
var sectionsLayer;
var select = document.getElementById('region');

select.addEventListener('change', function () {
  var region = this.value;
  map.eachLayer(function (layer) {
    map.removeLayer(layer);
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  fetch(`https://raw.githubusercontent.com/BryanLorin/geojsonBryan/main/${region}/departements-${region}.geojson`)
    .then(function (response) {
      return response.json();
    })
    .then(function (departements) {
      L.geoJSON(departements, {
        onEachFeature: function (feature, layer) {
          layer.on('click', function () {
            var departementCode = feature.properties.code;

            fetch(`https://raw.githubusercontent.com/BryanLorin/geojsonBryan/main/${region}/mutations-${region}-${departementCode}.json`)
              .then(response => response.json())
              .then(data => {
                ventes = data;
              });

            fetch(`https://raw.githubusercontent.com/BryanLorin/geojsonBryan/main/${region}/communes-${region}.geojson`)
              .then(function (response) {
                return response.json();
              })
              .then(function (communes) {
                var filteredCommunes = filterCommunes(departementCode, communes);

                if (communesLayer) {
                  map.removeLayer(communesLayer);
                }

                communesLayer = L.geoJSON(filteredCommunes, {
                  onEachFeature: function (feature, layer) {
                    layer.on('click', function () {
                      var communeCode = feature.properties.code;

                      var ventesDansCetteCommune = ventes.filter(vente => JSON.parse(vente.l_codinsee.replace(/'/g, "\"")).includes(communeCode));

                      if (document.getElementById("Communes").checked) {
                        if (document.getElementById("Count").checked) {
                          totalVentes += ventesDansCetteCommune.length;
                          document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
                          layer.setStyle({ fillColor: 'red' });
                          clickedCommunes.push(layer);
                        } else {
                          totalVentes = ventesDansCetteCommune.length;
                          document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
                        }
                      } else if (document.getElementById("Sections").checked) {
                        fetch(`https://raw.githubusercontent.com/BryanLorin/geojsonBryan/main/${region}/sections-${region}-${departementCode}.json`)
                          .then(function (response) {
                            return response.json();
                          })
                          .then(function (sections) {
                            var filteredSections = filterSections(communeCode, sections);

                            if (sectionsLayer) {
                              map.removeLayer(sectionsLayer);
                            }

                            sectionsLayer = L.geoJSON(filteredSections, {
                              onEachFeature: function (feature, layer) {
                                layer.on('click', function () {
                                  var sectionCode = feature.properties.code;
                                  var ventesDansCetteSection = ventes.filter(vente => JSON.parse(vente.l_section.replace(/'/g, "\"")).includes(sectionCode));

                                  if (document.getElementById("Count").checked) {
                                    totalVentes += ventesDansCetteSection.length;
                                    document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
                                    layer.setStyle({ fillColor: 'red' });
                                    clickedCommunes.push(layer);
                                  } else {
                                    totalVentes = ventesDansCetteSection.length;
                                    document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
                                  }
                                });
                              },
                            });
                            sectionsLayer.addTo(map);
                          });
                      }
                    });
                  },
                });
                communesLayer.addTo(map);
              });
          });
        },
      }).addTo(map);
    });
});

function filterCommunes(departementCode, communes) {
  return communes.features.filter(function (commune) {
    return commune.properties.code.startsWith(departementCode);
  });
}

function filterSections(communeCode, sections) {
  return sections.features.filter(function (section) {
    return section.id.startsWith(communeCode);
  });
}

// Reset totalVentes and clickedCommunes when reset button is clicked
document.getElementById("reset").addEventListener('click', function () {
  totalVentes = 0;
  document.getElementById("NumberSell").textContent = "";
  clickedCommunes.forEach(function (commune) {
    commune.setStyle({ fillColor: 'blue' });  // Replace 'blue' with your original color
  });
  clickedCommunes = [];
});
