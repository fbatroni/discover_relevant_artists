var artistTree = {};
var currentNode = artistTree;
var pastArtists = [];


//Initial query artist
document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    searchArtists(document.getElementById('query').value);
}, false);


//Fetch initial artist
var searchArtists = function (query) {
    $.ajax({
        url: 'https://api.spotify.com/v1/search',
        data: {
            q: query,
            type: 'artist'
        },
        success: function (response) {
            var firstArtist = response.artists.items[0]
            artistTree = {
                id: firstArtist.id,
                children: [],
                data: {
                    name: firstArtist.name,
                    image: firstArtist.images[0],
                    uri: firstArtist.uri
                }
            }
        pastArtists.push(firstArtist.id)
        fetchRelevantArtists(artistTree.id, artistTree)
        }
    });
};

//Select next relevant artist
var selectNextRelevantArtist = function(artistId, currentNode){
    var newCurrentIndex = _.findIndex(currentNode.children, {id: artistId})
    currentNode = currentNode.children[newCurrentIndex]
    fetchRelevantArtists(artistId, currentNode)
}

//Fetch relevant artists
var fetchRelevantArtists = function(artistId, currentNode){
    $.ajax({
        url: 'https://api.spotify.com/v1/artists/'+artistId+'/related-artists',
        success: function (response) {
            var newArtists = response.artists.filter((artist)=>{return pastArtists.indexOf(artist.id) === -1})
            newArtists.slice(0,10).forEach((artist)=>{
                object = {
                    id: artist.id,                    
                    children: [],
                    data: {
                        name: artist.name,
                        image: artist.images[0],
                        uri: artist.uri
                    }   
                }
                pastArtists.push(artist.id)
                if (currentNode['children']) currentNode['children'].push(object)
                else currentNode['children'] = [object]
            })
            updateD3Graph(artistTree, currentNode)
        }
    });
}



//initialize tree

// var drawTree = function(){
    var canvas = d3.select('body').append('svg')
        .style('overflow','scroll')
        .attr('width', 1500)
        .attr('height', 1000)
        .append('g')
            .attr('transform', 'translate(50,50)')

    var tree = d3.layout.tree()
        .size([400, 400])


    var diagonal = d3.svg.diagonal()
            .projection(function(d){return [d.y,d.x]})

    d3.select(self.frameElement).style("height", "800px");

    function collapse(d){
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse)
            d.children = null;
        }
    }
// }

function updateD3Graph(artistTree, currentNode){
    // drawTree();
    console.log('in updateD3Graph')
    // d3.selectAll("canvas").remove();

    var nodes = tree.nodes(artistTree);
    var links = tree.links(nodes);
    var node = canvas.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
            .attr('class','node')
            .attr('id', function(d){return d.id})
            .attr('transform', function(d){return 'translate(' + d.y + ',' + d.x + ')'})
            .on('click', function(d){
                selectNextRelevantArtist(d.id, currentNode)
                // updateD3Graph(currentNode)
            })

    node.append('image')
        .attr('xlink:href', function(d){return d.data.image.url})
        .attr('x','-12px')
        .attr('y','-12px')
        .attr('width','40px')
        .attr('height','40px')

    node.append('text')
        .text(function(d){ return d.data.name })
        .attr('x','40px')

    canvas.selectAll('.link')
        .data(links)
        .enter()
        .append('path')
        .attr('class','link')
        .attr('fill','none')
        .attr('stroke','#ADADAD')
        .attr('d', diagonal)
}

