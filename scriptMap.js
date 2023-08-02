var map = L.map('map').setView([45.7, 3.15], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);
var communesData;
var ventes;
var totalVentes = 0;
var clickedCommunes = [];
var clickedSections = [];  // Ajout du tableau pour stocker les sections cliquées
var historyDiv = document.getElementById('Historique');  // Ajout de la div Historique
var selectedCommunesCodinsee = [];
var selectedSectionsCodinsee = [];
var communesLayer;
var sectionsLayer;
var totalSecteur = 0;
var cumulativeVentes = 0;
var select = document.getElementById('region');

document.getElementById('Part').addEventListener('input', function() {
  var part = this.value;
  if(cumulativeVentes && part) {
    var marketShare = (part * 100) / cumulativeVentes;
    document.getElementById('MarketShare').textContent = marketShare;
  }
});


document.getElementById('Count').addEventListener('click', function() {
  if (clickedCommunes.length === 0) {
    totalVentes = 0;
    document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
  }
});
  
document.getElementById('Export').addEventListener('click', function() {
  // Récupérer le conteneur d'input
  var inputContainer = document.querySelector('.pop-up-form .input-container');
  
  // Supprimer les anciens inputs
  inputContainer.innerHTML = '';

  // Créer un nouvel input pour les communes sélectionnées
  var communesInput = document.createElement('input');
  communesInput.type = 'text';
  communesInput.value = selectedCommunesCodinsee.map(commune => `${commune.nom}: ${commune.code}`).join(', ');
  communesInput.readOnly = true;  // Rendre l'input en lecture seule
  inputContainer.appendChild(communesInput);

  // Créer un nouvel input pour les sections sélectionnées
  var sectionsInput = document.createElement('input');
  sectionsInput.type = 'text';
  sectionsInput.value = selectedSectionsCodinsee.map(section => `${section.nom}: ${section.code}`).join(', ');
  sectionsInput.readOnly = true;  // Rendre l'input en lecture seule
  inputContainer.appendChild(sectionsInput);


  // Calculate totalVentes for selected communes
  selectedCommunesCodinsee.forEach(selectedCommune => {
    var ventesDansCetteCommune = ventes.flatMap(vente => {
      var venteCommunes = JSON.parse(vente.l_codinsee.replace(/'/g, "\""));
      var venteSections = JSON.parse(vente.l_section.replace(/'/g, "\""));

      return venteCommunes.map((commune, index) => ({
        id: commune,
        section: venteSections[index],
        vente: vente
      }));
    }).filter(venteParCommune => 
      venteParCommune.id === selectedCommune.code && 
      (venteParCommune.vente.idnatmut === "1" || venteParCommune.vente.idnatmut === "4") && 
      (venteParCommune.vente.codtypbien.startsWith('1') && venteParCommune.vente.codtypbien !== '14' || venteParCommune.vente.codtypbien === '21') && 
      venteParCommune.vente.anneemut >= "2017" && venteParCommune.vente.anneemut <= "2020"
    );

    totalSecteur += Math.round(ventesDansCetteCommune.length / 4);
  });

  // Calculate totalVentes for selected sections
  selectedSectionsCodinsee.forEach(selectedSection => {
    var sectionCode = selectedSection.code.substring(0, 5);
    var sectionID = sectionCode + '; ' + selectedSection.code.substring(7);

    var ventesDansCetteSection = ventes.flatMap(vente => {
      var venteCommunes = JSON.parse(vente.l_codinsee.replace(/'/g, "\""));
      var venteSections = JSON.parse(vente.l_section.replace(/'/g, "\""));

      return venteCommunes.map((commune, index) => ({
        id: commune + '000' + venteSections[index],
        vente: vente
      }));
    }).filter(venteParSection => 
      venteParSection.id === sectionID && 
      (venteParSection.vente.idnatmut === "1" || venteParSection.vente.idnatmut === "4") && 
      (venteParSection.vente.codtypbien.startsWith('1') && venteParSection.vente.codtypbien !== '14' || venteParSection.vente.codtypbien === '21') && 
      venteParSection.vente.anneemut >= "2017" && venteParSection.vente.anneemut <= "2020"
    );

    totalSecteur += Math.round(ventesDansCetteSection.length / 4);
  });

  // Display the total sales
  document.getElementById("TotalSecteur").value = totalSecteur;
});



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
                communesData = communes;
                var filteredCommunes = filterCommunes(departementCode, communes);

                if (communesLayer) {
                  map.removeLayer(communesLayer);
                }

                communesLayer = L.geoJSON(filteredCommunes, {
                  onEachFeature: function (feature, layer) {
                    layer.on({
                      click: function () {
                       
						var communeCode = feature.properties.code;
        				var communeNom = feature.properties.nom;
        				historyDiv.textContent = 'Nom: ' + communeNom ;
       
                        // Ajouter à la liste des communes sélectionnées si 'Create' est coché
                        if(document.getElementById("Create").checked) {
                          // Créer un objet avec le code et le nom de la commune
                          var commune = {
                            code: communeCode,
                            nom: feature.properties.nom  // Assumer que 'nom' est la propriété contenant le nom de la commune
                          };
                          selectedCommunesCodinsee.push(commune);
                          layer.setStyle({ fillColor: 'blue' }); // Change la couleur de la commune sélectionnée
                        }
                      
                        // Vérifier si la commune a déjà été cliquée
                        var alreadyClicked = clickedCommunes.some(clickedCommune => 
                          clickedCommune._leaflet_id === layer._leaflet_id
                        );

                        if (alreadyClicked) {
                          return;  // Si la commune a déjà été cliquée, ne rien faire
                        }

                        var ventesDansCetteCommune = ventes.flatMap(vente => {
                          var venteCommunes = JSON.parse(vente.l_codinsee.replace(/'/g, "\""));
                          var venteSections = JSON.parse(vente.l_section.replace(/'/g, "\""));
                          
                          return venteCommunes.map((commune, index) => ({
                            id: commune,
                            section: venteSections[index],
                            vente: vente
                          }));
                        }).filter(venteParCommune => 
                          venteParCommune.id === communeCode && 
                          (venteParCommune.vente.idnatmut === "1" || venteParCommune.vente.idnatmut === "4") && 
                          (venteParCommune.vente.codtypbien.startsWith('1') && venteParCommune.vente.codtypbien !== '14' || venteParCommune.vente.codtypbien === '21') && 
                          venteParCommune.vente.anneemut >= "2017" && venteParCommune.vente.anneemut <= "2020"
                        );

                        if (document.getElementById("Count").checked) {
                          totalVentes += Math.round(ventesDansCetteCommune.length / 4);
                          document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
                          cumulativeVentes += totalVentes;
                          layer.setStyle({ fillColor: 'red' });
                          clickedCommunes.push(layer);
                        } else {
                          totalVentes = Math.round(ventesDansCetteCommune.length / 4);
                          document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
                          cumulativeVentes += totalVentes;
                        }

                        if (document.getElementById("Sections").checked) {
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
                                  var sectionID = feature.properties.id;

                                  // Extraire le l_codinsee et l_section de l'ID de la section
                                  var l_codinsee = sectionID.substring(0, 5);
                                  var l_section = sectionID.substring(8);
                          

                                  if(document.getElementById("Create").checked) {
                                  var section = {
                                    code: l_codinsee + '; ' + l_section,
                                    nom: communesData.features.find(commune => commune.properties.code === l_codinsee).properties.nom
                                  };
                                  selectedSectionsCodinsee.push(section);
                                  layer.setStyle({ fillColor: 'green' }); // Change la couleur de la section sélectionnée
                                }


                                  // Vérifier si la section a déjà été cliquée
                                  var alreadyClicked = clickedSections.some(clickedSection => 
                                    clickedSection._leaflet_id === layer._leaflet_id
                                  );

                                  if (alreadyClicked) {
                                    return;  // Si la section a déjà été cliquée, ne rien faire
                                  }


                                    var ventesDansCetteSection = ventes.flatMap(vente => {
                                      var venteCommunes = JSON.parse(vente.l_codinsee.replace(/'/g, "\""));
                                      var venteSections = JSON.parse(vente.l_section.replace(/'/g, "\""));
                                      
                                      return venteCommunes.map((commune, index) => ({
                                        id: commune + '000' + venteSections[index],
                                        vente: vente
                                      }));
                                    }).filter(venteParSection => 
                                      venteParSection.id === sectionID && 
                                      (venteParSection.vente.idnatmut === "1" || venteParSection.vente.idnatmut === "4") && 
                                      (venteParSection.vente.codtypbien.startsWith('1') && venteParSection.vente.codtypbien !== '14' || venteParSection.vente.codtypbien === '21') && 
                                      venteParSection.vente.anneemut >= "2017" && venteParSection.vente.anneemut <= "2020"
                                    );

                                    if (document.getElementById("Count").checked) {
                                      totalVentes += Math.round(ventesDansCetteSection.length / 4);
                                      document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
                                      layer.setStyle({ fillColor: 'red' });
                                      clickedSections.push(layer);
                                    } else {
                                      totalVentes = Math.round(ventesDansCetteSection.length / 4);
                                      document.getElementById("NumberSell").textContent = "Total: " + totalVentes;
                                      cumulativeVentes += totalVentes;
                                    }
                                  });
                                },
                              }).addTo(map);
                            });
                        }
                      },
                     
                    });
                  },
                }).addTo(map);
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
    return section.properties.id.startsWith(communeCode);
  });
}
  // Reset totalVentes and clickedCommunes when reset button is clicked
  document.getElementById("reset").addEventListener('click', function () {
    totalVentes = 0;
    cumulativeVentes = 0;
    document.getElementById("NumberSell").textContent = "";
    clickedCommunes.forEach(function (commune) {
      commune.setStyle({ fillColor: 'blue' });  // Replace 'blue' with your original color
    });
    clickedCommunes = [];
  });
