var artistTree = {};
var currentNode = artistTree;
var pastArtists = [];


// ************** Initialize the tree diagram  *****************
var margin = {
    top: 20,
    right: 120,
    bottom: 20,
    left: 120
  },
  width = 960 - margin.right - margin.left,
  height = 500 - margin.top - margin.bottom;

var i = 0,
  duration = 750,
  root;

var tree = d3.layout.tree()
  .size([height, width]);

var diagonal = d3.svg.diagonal()
  .projection(function(d) {
    return [d.y, d.x];
  });

var svg = d3.select("body").append("svg")
  .attr("width", width + margin.right + margin.left)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//Initial query for artist
document.getElementById('search-form').addEventListener('submit', function(e) {
  e.preventDefault();
  searchArtists(document.getElementById('query').value);
}, false);


var getRelevantArtists = function (artist) {
  return $.ajax({
    url: 'https://api.spotify.com/v1/artists/' + artist.id + '/related-artists'
  });
}

var getArtist = function (query) {
  return $.ajax({
    url: 'https://api.spotify.com/v1/search',
    data: {
      q: query,
      type: 'artist'
    }
  });
}

var mapRelatedArtists = function (node, parentArtist, artists) {
  var newArtists = artists.filter((artist) => {
    return pastArtists.indexOf(artist.id) === -1
  })
  _.map(newArtists, function(relevantArtist){
    object = {
      id: relevantArtist.id,
      children: [],
      name: relevantArtist.name,
      parent: parentArtist.name,
      image: relevantArtist.images[0],
      uri: relevantArtist.uri
    }
    // artistTree.children.push(object);

    if (node['children']) node['children'].push(object)
    else node['children'] = [object]

    pastArtists.push(relevantArtist.id)
    return object;
  })
}

//Fetch initial artist
var searchArtists = function (query) {

    getArtist(query)
    .then(function(response) {
      console.log('response:: ', response);
      var firstArtist = response.artists.items[0]
      artistTree = {
        id: firstArtist.id,
        parent: null,
        name: firstArtist.name,
        image: firstArtist.images[0],
        uri: firstArtist.uri,
        children: []
      }
      console.log('initial artistTree:: ', artistTree);
      return artistTree;
    })
    .then(function(artist) {
      // keep track of previous artists
      pastArtists.push(artist.id);
      getRelevantArtists(artist)
        .then(function(response) {

          mapRelatedArtists(artistTree, artist, response.artists);

          generateDiagram([artistTree])
          console.log('artistTree:: ', artistTree);
        });
    })
};


// ************** Generate the tree diagram  *****************
function generateDiagram(treeData) {

  root = treeData[0];
  root.x0 = height / 2;
  root.y0 = 0;

  update(root);

  d3.select(self.frameElement).style("height", "500px");

}

function update(source) {

  // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse(),
    links = tree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) {
    d.y = d.depth * 180;
  });

  // Update the nodes…
  var node = svg.selectAll("g.node")
    .data(nodes, function(d) {
      return d.id || (d.id = ++i);
    });

  node.append('image')
    .attr('xlink:href', function(d) {
      return d.image.url
    })
    .attr('x', '-12px')
    .attr('y', '-12px')
    .attr('width', '40px')
    .attr('height', '40px')

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .attr("transform", function(d) {
      return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on("click", click);


  nodeEnter.append('image')
    .attr('xlink:href', function(d) {
      return d.image.url
    })
    .attr('x', '-12px')
    .attr('y', '-12px')
    .attr('width', '40px')
    .attr('height', '40px')

  nodeEnter.append("text")
    .attr("x", function(d) {
      return d.children || d._children ? -20 : 35;
    })
    .attr("dy", ".35em")
    .attr("text-anchor", function(d) {
      return d.children || d._children ? "end" : "start";
    })
    .text(function(d) {
      return d.name;
    })
    .style("fill-opacity", 1e-6);

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
    .duration(duration)
    .attr("transform", function(d) {
      return "translate(" + d.y + "," + d.x + ")";
    });

  nodeUpdate.select("circle")
    .attr("r", 10)
    .style("fill", function(d) {
      return d._children ? "lightsteelblue" : "#fff";
    });

  nodeUpdate.select("text")
    .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
    .duration(duration)
    .attr("transform", function(d) {
      return "translate(" + source.y + "," + source.x + ")";
    })
    .remove();

  nodeExit.select("circle")
    .attr("r", 1e-6);

  nodeExit.select("text")
    .style("fill-opacity", 1e-6);

  // Update the links…
  var link = svg.selectAll("path.link")
    .data(links, function(d) {
      return d.target.id;
    });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
    .attr("class", "link")
    .attr("d", function(d) {
      var o = {
        x: source.x0,
        y: source.y0
      };
      return diagonal({
        source: o,
        target: o
      });
    });

  // Transition links to their new position.
  link.transition()
    .duration(duration)
    .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
    .duration(duration)
    .attr("d", function(d) {
      var o = {
        x: source.x,
        y: source.y
      };
      return diagonal({
        source: o,
        target: o
      });
    })
    .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Toggle children on click.
function click(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;

    if (d.children) {
      console.log ('number of kids:: ', d.children.length);
    }else{
      console.log ('there are no children::: fetching:::');
      console.log ('currentNode:: ', d);
      var currentNode = d;
      getRelevantArtists(d)
      .then(function(response){
        mapRelatedArtists(currentNode, d, response.artists );
        update(d);
      })

    }
  }
  update(d);
}