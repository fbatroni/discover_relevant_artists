var artistTree = {};
var currentNode = artistTree;
var pastArtists = [];


//Initial query artist
document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    searchArtists(document.getElementById('query').value);
}, false);

var artistId = '13saZpZnCDWOI9D4IJhp1f';
var playArtist = function(artistId){
    $.ajax({
        url: 'https://api.spotify.com/v1/artists/' + artistId + '/top-tracks',
        data: {
            country: 'US'
        },
        success: function(response) {
            var audioObject = new Audio(response.tracks[0].preview_url)
            audioObject.play();
            // audioObject.addEventListener('ended', function())
        }

    })
}


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
            newArtists.slice(0,5).forEach((artist)=>{
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
            console.log('updated artistTree', artistTree)
            updateD3Graph(artistTree, currentNode)
        }
    });
}


//initialize tree
    var canvas = d3.select('.d3container').append('svg')
        .style('overflow','scroll')
        .attr('width', 1500)
        .attr('height', 1500)
        .append('g')
            .attr('transform', 'translate(50,50)')


    d3.select("svg").on("dblclick.zoom", null);

    var linkG = canvas.append('g')

    var nodeG = canvas.append('g')

    var tree = d3.layout.tree()
        .size([1000, 1000])
        .separation(function(a,b){return a.parent == b.parent ? 1 : 2})


    var diagonal = d3.svg.diagonal()
            .projection(function(d){return [d.y,d.x]})

    d3.select(self.frameElement).style("height", "800px");

    function toggleAll(d) {
        if (d.children) {
          d.children.forEach(toggleAll);
          toggle(d);
        }
    }

    function toggle(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
    }


function updateD3Graph(artistTree, currentNode){

    var nodes = tree.nodes(artistTree);
    var links = tree.links(nodes);

    var node = nodeG.selectAll('.node')
        .data(nodes, function(d){return d.id})

    var dblclick_timer = false;

    var nodeEnter = node.enter()
            .append('g') //g = group
            .attr('class','node')
            .attr('id', function(d){return d.id})
            .attr('transform', function(d){return 'translate(' + d.y + ',' + d.x + ')'})
            .on('click', function(d){
                if (dblclick_timer){
                    clearTimeout(dblclick_timer)
                    dblclick_timer = false;
                    console.log('double click fired')
                }
                else {
                    dblclick_timer = setTimeout(function(){
                        dblclick_timer = false;
                        click(d)
                    }, 250)
                }
                var click = function(d){
                    if (d._children) {
                    toggle(d)
                    updateD3Graph(artistTree, currentNode)
                    return;
                    }
                    if (d.children) {
                        toggle(d)
                        updateD3Graph(artistTree, currentNode)
                        return;
                    }
                    else {
                        selectNextRelevantArtist(d.id, currentNode)
                    }
                }
            })
            // .on('mousedown', function(d){

            //     console.log('just double clicked in d3')
            //     playArtist(d.id)
            // })
            // .on('hover', function(d){
            //     console.log('just double clicked in d3')
            //     playArtist(d.id)
            // })
            // .on('click', function(d){
            //     if (d._children) {
            //         toggle(d)
            //         updateD3Graph(artistTree, currentNode)
            //         return;
            //     }
            //     if (d.children) {
            //         toggle(d)
            //         updateD3Graph(artistTree, currentNode)
            //         return;
            //     }
            //     else {
            //         selectNextRelevantArtist(d.id, currentNode)
            //     }
            // })



    node.attr('transform', function(d){return 'translate(' + d.y + ',' + d.x + ')'}) //update selection

    nodeEnter.append('image')
        .attr('xlink:href', function(d){return d.data.image.url})
        .attr('x','-12px')
        .attr('y','-12px')
        .attr('width','40px')
        .attr('height','40px')

    nodeEnter.append('text')
        .text(function(d){ return d.data.name })
        .attr('x','40px')

    var link = linkG.selectAll('.link')
        .data(links, function(d){return d.source.id + '-' + d.target.id}) //connect existing to new (links via node id), otherwise done via index
        
    link.enter() //separate enter and update selections
        .append('path')
        .attr('class','link')
        .attr('fill','none')
        .attr('stroke','#ADADAD')
        // .attr('d', diagonal)

        link.attr('d', diagonal)

    var nodeExit = node.exit()
        .transition()
        .attr('transform', function(d){return 'translate(' + d.y + ',' + d.x + ')'})
        .remove()

    var linkExit = link.exit()
        .transition()
        .attr('d', function(d){
            var o = {x: d.source.x, y: d.source.y}
            return diagonal({source: o, target: o})
        })
        .remove()

    nodes.forEach((d)=>{
        d.y = d.depth * 90
    })

    nodes.forEach((d)=>{
        d.x0 = d.x;
        d.y0 = d.y;
    })
}

