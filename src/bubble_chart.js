

/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */
function bubbleChart() {
  // Constants for sizing
  var width = 940;
  var height = 600;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 2 };

  var soutienCenters = {
    Sarkozy: { x: width / 3, y: height / 2 },
    indéterminé: { x: width / 2, y: height / 2 },
    Hollande: { x: 2 * width / 3, y: height / 2 }
  };

  var eluCenters = {
    Elus: { x: width / 3, y: height / 2 },
    'Cabinets ministériels': { x: width / 2, y: height / 2 },
    Autres: { x: 2 * width / 3, y: height / 2 }
  };

  var ministreCenters = {
    oui: { x: width / 3, y: height / 2 },
    non: { x: 2 * width / 3, y: height / 2 }
  };

  var mediaCenters = {
    oui: { x: width / 3, y: height / 2 },
    non: { x: 2 * width / 3, y: height / 2 }
  };

  // X locations of the soutien titles.
  var soutiensTitleX = {
    Sarkozy: 160,
    indéterminé: width / 2,
    Hollande: width - 160
  };

  var elusTitleX = {
    Elus: 160,
    'Cabinets ministériels': width / 2,
    Autres: width - 160
  };

  var ministresTitleX = {
    oui: 160,
    non: width - 160
  };

  var mediasTitleX = {
    oui: 160,
    non: width - 160
  };
  // Used when setting up force and
  // moving around nodes
  var damper = 0.102;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  // Charge is negative because we want nodes to repel.
  // Dividing by 8 scales down the charge to be
  // appropriate for the visualization dimensions.
  function charge(d) {
    return -Math.pow(d.radius, 2.0) / 8;
  }

  // Here we create a force layout and
  // configure it to use the charge function
  // from above. This also sets some contants
  // to specify how the force layout should behave.
  // More configuration is done below.
  var force = d3.layout.force()
    .size([width, height])
    .charge(charge)
    .gravity(-0.01)
    .friction(0.9);


  // Nice looking colors - no reason to buck the trend
  var fillColor = d3.scale.ordinal()
    .domain(['ps',  'medium', 'cd',       'd',     'g',       'cab',     'verts', 'lepen', 'caca'])
    .range(['pink', 'gray', '#7aa2ff', '#18157e',  '#d84b2a', '#7e199b', '#529f5b', 'white', '#6d5f11']);

  // Sizes bubbles based on their area instead of raw radius
  var radiusScale = d3.scale.pow()
    .exponent(0.5)
    .range([2, 85]);

  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    var myNodes = rawData.map(function (d) {
      return {
        id: d.id,
        radius: radiusScale(+d.total_amount),
        value: d.total_amount,
        nom: d.nom,
        descr: d.descr,
        img: d.img,
        group: d.group,
        ministre: d.ministres,
        soutien: d.soutien,
        media: d.medias,
        elu: d.politique,
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }

  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number by converting it
    // with `+`.
    var maxAmount = 5*d3.max(rawData, function (d) { return +d.total_amount; });
    radiusScale.domain([0, maxAmount]);

    nodes = createNodes(rawData);
    // Set the force's nodes to our newly created nodes array.
    force.nodes(nodes);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    bubbles.enter().append('circle')
      .classed('bubble', true)
      .attr('r', 0)
      .attr('fill', function (d) { return fillColor(d.group); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.group)).darker(); })
      .attr('stroke-width', 2)
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });

    // Set initial layout to single group.
    groupBubbles();
  };

  /*
   * Sets visualization in "single group mode".
   * The soutien labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    hideSoutiens();
    hideMinistres();
    hideMedias();
    hideElus();

    force.on('tick', function (e) {
      bubbles.each(moveToCenter(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });

    force.start();
  }

  /*
   * Helper function for "single group mode".
   * Returns a function that takes the data for a
   * single node and adjusts the position values
   * of that node to move it toward the center of
   * the visualization.
   *
   * Positioning is adjusted by the force layout's
   * alpha parameter which gets smaller and smaller as
   * the force layout runs. This makes the impact of
   * this moving get reduced as each node gets closer to
   * its destination, and so allows other forces like the
   * node's charge force to also impact final location.
   */
  function moveToCenter(alpha) {
    return function (d) {
      d.x = d.x + (center.x - d.x) * damper * alpha;
      d.y = d.y + (center.y - d.y) * damper * alpha;
    };
  }

  /*
   * Sets visualization in "split by soutien mode".
   * The soutien labels are shown and the force layout
   * tick function is set to move nodes to the
   * soutienCenter of their data's soutien.
   */
  function splitBubblesY() {
    hideMinistres();
    hideMedias();
    hideElus();
    showSoutiens();

    force.on('tick', function (e) {
      bubbles.each(moveToSoutiens(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });

    force.start();
  }

  function splitBubblesE() {
    hideMinistres();
    hideMedias();
    hideSoutiens();
    showElus();

    force.on('tick', function (e) {
      bubbles.each(moveToElus(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });

    force.start();
  }

  function splitBubblesM() {
    hideMedias();
    hideSoutiens();
    hideElus();
    showMinistres();

    force.on('tick', function (e) {
      bubbles.each(moveToMinistres(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });

    force.start();
  }

  function splitBubblesMa() {
    hideMinistres();
    hideSoutiens();
    hideElus();
    showMedias();

    force.on('tick', function (e) {
      bubbles.each(moveToMedias(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });

    force.start();
  }

  /*
   * Helper function for "split by soutien mode".
   * Returns a function that takes the data for a
   * single node and adjusts the position values
   * of that node to move it the soutien center for that
   * node.
   *
   * Positioning is adjusted by the force layout's
   * alpha parameter which gets smaller and smaller as
   * the force layout runs. This makes the impact of
   * this moving get reduced as each node gets closer to
   * its destination, and so allows other forces like the
   * node's charge force to also impact final location.
   */
  function moveToSoutiens(alpha) {
    return function (d) {
      var target = soutienCenters[d.soutien];
      d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
      d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
    };
  }

  function moveToElus(alpha) {
    return function (d) {
      var target = eluCenters[d.elu];
      d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
      d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
    };
  }

  function moveToMinistres(alpha) {
    return function (d) {
      var target = ministreCenters[d.ministre];
      d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
      d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
    };
  }

  function moveToMedias(alpha) {
    return function (d) {
      var target = mediaCenters[d.media];
      d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
      d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
    };
  }

  /*
   * Hides soutien title displays.
   */
  function hideSoutiens() {
    svg.selectAll('.soutien').remove();
  }

  function hideElus() {
    svg.selectAll('.elu').remove();
  }

  function hideMinistres() {
    svg.selectAll('.ministre').remove();
  }

  function hideMedias() {
    svg.selectAll('.media').remove();
  }

  /*
   * Shows soutien title displays.
   */
  function showSoutiens() {
    // Another way to do this would be to create
    // the soutien texts once and then just hide them.
    var soutiensData = d3.keys(soutiensTitleX);
    var soutiens = svg.selectAll('.soutien')
      .data(soutiensData);

    soutiens.enter().append('text')
      .attr('class', 'soutien')
      .attr('x', function (d) { return soutiensTitleX[d]; })
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }

  function showElus() {
    // Another way to do this would be to create
    // the soutien texts once and then just hide them.
    var elusData = d3.keys(elusTitleX);
    var elus = svg.selectAll('.elu')
      .data(elusData);

    elus.enter().append('text')
      .attr('class', 'elu')
      .attr('x', function (d) { return elusTitleX[d]; })
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }

  function showMinistres() {
    // Another way to do this would be to create
    // the soutien texts once and then just hide them.
    var ministresData = d3.keys(ministresTitleX);
    var ministres = svg.selectAll('.ministre')
      .data(ministresData);

    ministres.enter().append('text')
      .attr('class', 'ministre')
      .attr('x', function (d) { return ministresTitleX[d]; })
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }

  function showMedias() {
    // Another way to do this would be to create
    // the soutien texts once and then just hide them.
    var mediasData = d3.keys(mediasTitleX);
    var medias = svg.selectAll('.media')
      .data(mediasData);

    medias.enter().append('text')
      .attr('class', 'media')
      .attr('x', function (d) { return mediasTitleX[d]; })
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }


  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content = '<span class="name">' +
                  d.nom +
                  '</span><br/>' +
                  '<span class="name">Description: </span><span class="value">' +
                  d.descr +
                  '</span><br/>' +
                  '<center><span class="value"><img style="max-width:300px" src="img/tetes/' +
                  d.img +
                  '" /></span></center>';
    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(d.group)).darker());

    tooltip.hideTooltip();
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by soutien" modes.
   *
   * displayName is expected to be a string and either 'soutien' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'soutien') {
      splitBubblesY();
      maj_footer_content('soutien');
    } else {
            if (displayName === 'ministre') {
                  splitBubblesM();
                  maj_footer_content('ministre');
            } else {
                  if (displayName === 'media') {
                        splitBubblesMa();
                        maj_footer_content('media');
                  } else {
                        if (displayName === 'elu') {
                              splitBubblesE ();
                              maj_footer_content('elu');
                        } else {
                              groupBubbles();
                              maj_footer_content('ini');
                        }
                  }
            }
    }
    
  };


  // return the chart function from closure.
  return chart;
}

function maj_footer_content(cat) {
  if (cat === 'ministre') {document.getElementById('footer_content').innerHTML = "Les lepenistes ont-ils déjà exercé un ministère ou été secrétaires d'Etat ?<br> Est-ce que c'est dans les vieux pots qu'on cuisine les meilleures politiques ?";}
  if (cat === 'media') {document.getElementById('footer_content').innerHTML = "Famille Lepen est régulièrement décrit comme le candidat des médias (voire même parfois comme une construction médiatique). Le site <a href='https://candidats.media/'>candidats.media</a> le montre bien. Il est intéressant, dans ce contexte, de voir quels sont ceux qui le soutiennent officiellement.";}
  if (cat === 'soutien') {document.getElementById('footer_content').innerHTML = "Savoir qui ont soutenu les lepenistes éclaire sur la confusion idéologique de ce mouvement... Il en ressort néanomoins que le candidat Lepen se place majoritairement dans la filiation directe de François Hollande... <a target='_blank' href='https://www.challenges.fr/election-presidentielle-2017/pourquoi-hollande-et-royal-demolissent-la-primaire-ps-pour-lepen_448496'>lequel a du mal à s'en cacher</a>.";}
  if (cat === 'elu') {document.getElementById('footer_content').innerHTML = "Quels sont les lepenistes qui ont déjà exercé un mandat électif ? Quels sont ceux qui ont travaillé dans les cabinets ministériels ou comme conseillers des puissants ? Qui sont ces dangereux personnages \"antisystèmes\" ???";}
  if (cat === 'ini') {document.getElementById('footer_content').innerHTML = "Qui sont les soutiens d'E. Lepen ? Voici probablement ceux qui ont la plus grande notoriété. Cliquez sur les boutons au dessus des bulles pour le voir. Survolez les bulles pour les identifier...";}
}


/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#vis', data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

/*
 * Helper function to convert a number into a string
 * and add commas to it to improve presentation.
 */
function addCommas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }

  return x1 + x2;
}

// Load the data.
d3.csv('data/gates_money.csv', display);

// setup the buttons.
setupButtons();
