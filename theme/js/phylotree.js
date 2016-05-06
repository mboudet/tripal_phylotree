/* phylotree d3js graphs */

(function ($) {
  
  var width = 550;
  var height = 0; // will be dynamically sized in displayData
  var pane = null;
  var organisms = {}; // lazily build hash of organisms, for displ. on legend
      
  function currentPane() {
    // parse the url hash, or the href query string to see which
    // sub-pane the navigation is on (the pane can appear in either
    // the hash or the query string)
    var url = window.location.href;
    var matches = url.match(/pane=(\w+)/i);
    if(! matches) {
      return 'base';
    }
    return matches[1];
  }

  function hiliteNodeNames(lowercase) {
    // Using the URI.js library parse the url query string for a one
    // or more hilite_node parameters. Return an object with
    // properties set for each node name to hilite.
    var uri = new URI(window.location.href);
    var query = uri.query(true);
    if(! query.hilite_node) {
      return {};
    }
    if(_.isArray(query.hilite_node)) {
      return _.zipObject(_.map(query.hilite_node, function(nodeName) {
	return lowercase ?
	  [nodeName.toLowerCase(), true] : [nodeName, true];
      }));
    }
    if(query.hilite_node.indexOf(',') >= 0) {
      // this appears to be a comma separated list
      var hiliteNodes =  query.hilite_node.split(',');
      return _.zipObject(_.map(hiliteNodes, function(nodeName) {
	return lowercase ?
	  [nodeName.toLowerCase(), true] : [nodeName, true];
      }));
    }
    // else generate a single item list
    return lowercase ?
      _.zipObject([query.hilite_node.toLowerCase(), true]) :
      _.zipObject([query.hilite_node, true]);
  }

  function d3GraphOnPane(pane) {
    return ['base',
	    'phylotree_circ_dendrogram',
	    'phylotree_organisms'].indexOf(pane) !== -1;
  }

  function displayLegend(forPane) {

    var litems = [];
    _.each(organisms, function(val, key) {
      litems.push(val);
    });
    
    litems.sort( function(a,b) {
      return 0;
    });
    
    litems.sort( function(a,b) {

      if(a.isLegume && ! b.isLegume) {
	return -1;
      }
      if(! a.isLegume && b.isLegume) {
	return 1;
      }
      return a.label.localeCompare(b.label);      
    });
    
    var container = d3.selectAll('.organism-legend');
    container.selectAll('div').remove();
    
    var rows = container.selectAll('div')
	.data(litems)
	.enter()
	.append('div')
        .attr('class', 'org-legend-row');
    rows.append('span')
      .attr('class', 'org-legend-color')
      .append('svg:svg')
      .attr('width', 14)
      .attr('height', 18)
      .append('svg:circle')
      .attr('class', 'legend-circle')
      .attr('cx', 7)
      .attr('cy', 18)
      .attr('r', 6)
      .attr('stroke', 'dimgrey')
      .attr('stroke-width', '1px')
      .attr('fill', function(d) { return d.color; });
    rows.append('span')
       .attr('class', 'org-legend-label')
      .html(function(d) { return d.label; });

    if(forPane !== 'phylotree_organisms') {
      var div = container.insert('div', ':first-child');
      div.attr('class', 'org-legend-row')
	.append('span')
	.attr('class', 'org-legend-color')
	.append('svg:svg')
	.attr('width', 14)
	.attr('height', 18)
	.append('svg:circle')
	.attr('cx', 7)
	.attr('cy', 18)
	.attr('r', 6)
	.attr('stroke', 'dimgrey')
	.attr('stroke-width', '2px')
	.attr('fill', 'white');
      div.append('span')
	.attr('class', 'org-legend-label')
	.html('internal node');

      div = container.insert('div', ':first-child');
      div.attr('class', 'org-legend-row')
	.append('span')
	.attr('class', 'org-legend-color')
	.append('svg:svg')
	.attr('width', 14)
	.attr('height', 18)
	.append('svg:circle')
	.attr('cx', 7)
	.attr('cy', 18)
	.attr('r', 6)
	.attr('stroke', 'black')
	.attr('stroke-width', '1px')
	.attr('fill', 'dimgrey');
      div.append('span')
	.attr('class', 'org-legend-label')
	.html('root node');

      var hilites = hiliteNodeNames(false);
      var warning = '';
      if(! $('.hilite-node').length) {
	warning = ' (FEATURE NOT FOUND)';
      }
      var hiliteNames = _.keys(hilites);
      if(hiliteNames && hiliteNames.length) {
	var div = container.append('div')
	    .attr('class', 'org-legend-row');
	div.append('span')
	  .attr('class', 'org-legend-color')
	  .append('svg:svg')
  	  .attr('width', 14)
	  .attr('height', 18)
	  .append('svg:rect')
	  .attr('x', 0)
	  .attr('y', 10)
	  .attr('width', 14)
	  .attr('height', 10)
	  .attr('fill', 'khaki');
	div.append('span')
	  .attr('class', 'org-legend-label')
	  .html('hilite: '+  hiliteNames.join(', ') + warning);
      }
    }
    
    var dialog = $('#organism-legend-dialog');
    //allows re-open of dialog, basically a toggle between this
    //element and the dialog being visible
    $('.organism-legend-show').click(function() {
      var dialog = $('#organism-legend-dialog');
      dialog.dialog('option', {
	position: {
	  my : 'left top',
	  at : 'right top',
	  of : $('.organism-legend-show'),
	}
      });
      dialog.dialog('open');
      $('.organism-legend-show').hide();
    });

    var positionOf = null, positionMy = null, positionAt = null;
    if(hiliteNames && hiliteNames.length) {
      // d3.phylogram.js *may* have added this class to an el.
      //      positionOf = $('.hilite-node').first();
      positionOf = topmostElementIn('.hilite-node');
      positionMy = 'left top';
      positionAt = 'right';
    }
    else {
      switch(forPane) {
      case 'base':
	positionOf = $('#phylogram');
	break;
      case 'phylotree_circ_dendrogram':
	positionOf = $('#phylotree-radial-graph');
	break;
      case 'phylotree_organisms':
	positionOf = $('#phylotree-organisms');
	break;
      }
      positionMy = 'right top';
      positionAt = 'right top';
    }
    var position = {
      my : positionMy,
      at : positionAt,
      of : positionOf,
      collision : 'fit flip',
      offset : '1000 -20',
    };
    dialog.dialog({
      title : 'Phylogram Legend',
      closeOnEscape : true,
      modal : false,
      width : '300px',
      close: function() {
	$('.organism-legend-show').show();
      },
      position : position,
    });
  }

  function topmostElementIn(selector) {
    var top = Infinity;
    var topElem = null;
    jQuery(selector).each(function() {
      var offset = $(this).offset();
      if(offset.top > 0 && offset.top < top) {
	top = offset.top;
	topElem = $(this);
      }
    });
    return topElem;
  }

  function species5(d)  {
    // the 5 letter abbreviation -- YMMV
    var label = d.genus.substring(0, 3) + d.species.substring(0, 2);
    return label.toLowerCase();
  }
  
  // function to generate color based on the organism genus and
  // species on graph node d, using taxonColor js library. lazily make
  // a hash of all organisms for display on legend.
  function getColor(d) {
    var color = null;
    
    // check for odd 'default' value, haven't been able to track it down.
    if(! _.has(d, 'name')) { return; }
    
    var taxon = d.genus + ' ' + d.species;
    var isLegume = false;
    // check if this is a legume, if so colorize with taxonChroma library.
    if(_.has(taxonChroma.legumeGenera, d.genus.toLowerCase())) {
      isLegume = true;
      color = taxonChroma.get(taxon.toLowerCase(), {
	'overrides' : {
	  // we have 2 species of arachis which are not distinguishable
	  // in the phylotree context, so force one to be a different
	  // shade, but same hue.
	  'arachis ipaensis' : 'rgb(170, 171, 0)',
	}});
    }
    else {
      color = taxonChroma.defaultColor;
    }
    var abbrev = species5(d);
    
    if(! organisms[abbrev]) {
      // lazily add to legend
      var litem  = {
	label : abbrev + ' (' + d.genus + ' '+ d.species +
	  ', ' + d.common_name + ')',
	color : color,
	data : d,
	isLegume : isLegume,
      };
      organisms[abbrev] = litem;
    }
    return color;
  }
  
  $(document).ready( function () {

    $('.phylogeny-help-btn').click(function() {
      $('#phylogeny-help-dlg').dialog( {
        title: 'Gene Family Help',
        closeOnEscape : true,
	width: '500px',
        modal: false,
        position: {
	  my: 'center top', at: 'top', of: window
	},
        show: { effect: 'blind', direction: 'down', duration: 200 }
      });
    });
    
    pane = currentPane();
    
    // when user navigates to a sub-panel without a graph, hide any popups
    // and redisplay the legend if applicable.
    $('.tripal_toc_list_item_link').click(function() {
      $('#organism-legend-dialog').dialog('close');
      var newPane = $(this).attr('id');
      if (d3GraphOnPane(newPane)) {
	// redisplay the legend only if there is a d3 graph on new panel
    	setTimeout(function() {
    	  // wait until new panel is displayed, to popup the legend
	  // because it needs to position wrt the current d3 graph
    	  displayLegend(newPane);
    	}, 100);
      }
      // always hide the Show Legend links by default (because Legend
      // appears by default)
      $('.organism-legend-show').hide();
      // always close the interior node dialog
      $('#phylonode_popup_dialog').dialog('close');
      // always close the help dialog
      $('#phylogeny-help-dlg').dialog('close');
      return false;
    });

    // callback for mouseover event on graph node d
    var nodeMouseOver = function(d) {
      var el =$(this);
      el.attr('cursor', 'pointer');
      var circle = el.find('circle');
      // highlight node no matter if leaf or interior node
      circle.attr('fill', 'dimgrey');
      if(! d.children) {
        // only leaf nodes have descriptive text
        var txt = el.find('text');
        txt.attr('font-weight', 'bold');
      }
    };
    
    // callback for mouseout event on graph node d
    var nodeMouseOut = function(d) {
      var el = $(this);
      el.attr('cursor', 'default');
      var circle = el.find('circle');
      if(! d.children) {
        // restore the color based on organism id for leaf nodes
        circle.attr('fill', getColor(d));
        var txt = el.find('text');
        txt.attr('font-weight', 'normal');
      }
      else {
        // restore interior nodes to white
        circle.attr('fill', 'white');
      }
    };
    
    // callback for mousedown/click event on graph node d
    var nodeMouseDown = function(d) {
      var el = $(this);
      var dialog = $('#phylonode_popup_dialog');
      // clear previous content, if any
      dialog.empty();
      // make a container div, hidden until the ajax request is finished.
      var container = $('<div id="linkouts-container"></div>');
      dialog.append(container);
      container.hide();
      var linkouts = $('<div id="ajax-linkouts"></div>');
      container.append(linkouts);
      addTripalOrganismLink(container, d);
      addTripalFeatureLink(container, d);
      addExternalLinks(dialog, container, d);
      dialog.dialog({
        title : (! d.children ) ? d.name : 'interior node',
        position : { my : 'center center', at : 'center center', of : el },
        show : { effect: 'blind', direction: 'down', duration: 200 },
        closeOnEscape : true,
        modal : false,
      });
    };

    d3.json(phylotreeDataURL,
	    function(error, treeData) {
	      if(error) { return console.warn(error); }
	      displayData(treeData);
	      if(d3GraphOnPane(pane)) {
		displayLegend(pane)
	      }
	      $('.phylogram-ajax-loader').remove();
	    });

    function displayData(treeData) {
      // draw the d3 graphs. in the current tripal pane
      // implementation, all content is drawn at page load, and then
      // shown/hidden with javascript. so all d3 graphs will get drawn
      // all the time.
      var leaves = leafNodes(treeData);
      height = 22 * leaves.length;
      var hilites = hiliteNodeNames(true);
      d3.phylogram.build('#phylogram', treeData, {
        'width' : width,
        'height' : height,
        'fill' : getColor,
	'hiliteNodes' : hilites,
        'nodeMouseOver' : nodeMouseOver,
        'nodeMouseOut' : nodeMouseOut,
        'nodeMouseDown' : nodeMouseDown
      });
      d3.phylogram.buildRadial('#phylotree-radial-graph', treeData, {
        'width' : width, // square graph 
        'fill' : getColor,
	'hiliteNodes' : hilites,	
        'nodeMouseOver' : nodeMouseOver,
        'nodeMouseOut' : nodeMouseOut,
        'nodeMouseDown' : nodeMouseDown
      });
      organismBubblePlot('#phylotree-organisms', treeData, {
        'height' : width, // square graph
        'width' : width, 
        'fill' : getColor,
        'nodeMouseOver' : nodeMouseOver,
        'nodeMouseOut' : nodeMouseOut,
        'nodeMouseDown' : nodeMouseDown
      });
    }

    function leafNodes(node) {
      /* for a root or interior node, return an array of leaf nodes. a leaf 
       * node by definition has no children
       */
      function _trampoline(f) {
	while (f && f instanceof Function) {
	  f = f();
	}
	return f;
      }
      function _collectLeaves(n, result) {
	if(! n.children) {
	  result.push(n);
	  return result;
	}
	else {
	  return function() {
	    _.each(n.children, function(n) {
	      result = _trampoline(_collectLeaves.bind(null, n, result))
	    });
	    return result;
	  }
	}
      }
      return _trampoline(_collectLeaves.bind(null,node,[]))
    }

    function addTripalOrganismLink(dialogElem, node) {
      /* add a tripal organism link to the dialog element, if this is a
       * leaf node and organism is known. 
       */
      if(node.children || ! node.organism_node_id) {
	// either this is an interior node, or the organism is not known.
	// don't add an organism link.
	return;
      }
      var linkAttr = {
	id:  'organism_link',
	href: '/node/' + node.organism_node_id,
	text: 'view organism: ' + node.genus + ' '+
	  node.species + ( node.common_name ?
			   ' (' + node.common_name + ')' : '' ),
	tabindex: '-1', /* prevent link from being hilited by default */
      };
      var a = $('<a/>', linkAttr);
      dialogElem.append(a);
      dialogElem.append($('<br/>'));
    }

    function addTripalFeatureLink(dialogElem, node) {
      /* add a tripal feature link to the dialog element, if this is a
       * leaf node and the feature is known.
       */
      if(node.children || ! node.feature_node_id) {
	// either this is an interior node, or the feature is not known.
	// don't add a feature link.
	return;
      }
      var linkAttr = {
	id:  'feature_link',
	href: '/node/' + node.feature_node_id,
	text: 'view feature: ' + node.feature_name,
	tabindex: '-1',	 /* prevent link from being hilited by default */
      };
      var a = $('<a/>', linkAttr);
      dialogElem.append(a);
      dialogElem.append($('<br/>'));
    }

    function addExternalLinks(dialogElem, containerElem, node) {
      /* contact LIS link-out service for json list of href,text linkouts
       */
      if(node.children) {
	// interior node link outs (if any)
	var leaves = leafNodes(node);
	var legumes = _.filter(leaves, function(d) {
	  return d.genus.toLowerCase() in taxonChroma.legumeGenera;
	});
	if(legumes.length) {
	  /* context viewer */
	  var url = '/lis_context_viewer/index.html#/basic/'+node.phylonode_id;
	  var linkAttr = {
	    id : 'context_viewer_link_out_',
	    href : url,
	    text : 'View Genomic Contexts for genes in this subtree',
	    tabindex: '-1', /* prevent link being hilited by default */
	  };
	  var a = $('<a/>', linkAttr);
	  containerElem.append(a);
	  containerElem.append($('<br/>'));
	  /* cmtv */
	  var url = 'http://velarde.ncgr.org:7070/isys/launch?svc=org.ncgr.cmtv.isys.CompMapViewerService%40--style%40http://velarde.ncgr.org:7070/isys/bin/Components/cmtv/conf/cmtv_combined_map_style.xml%40--combined_display%40' + window.location.origin + '/lis_gene_families/chado/phylo/node/gff_download/' + node.phylonode_id;
	  var linkAttr = {
	    id : 'cmtv_link_out',
	    href : url,
	    text : 'View Genomic Distribution for genes in this subtree',
	    tabindex: '-1', /* prevent link being hilited by default */
	  };
	  var a = $('<a/>', linkAttr);
	  containerElem.append(a);
	  containerElem.append($('<br/>'));
	}
	else {
	  var p  = containerElem.append($('<p>'));
	  p.html('Sorry, no resources are available for this sub-tree. ' +
		 'Please try another node.');
	}
	containerElem.show();
      }
      else {
	var spinnerEl=$("<img src='"+pathToTheme+ "/image/ajax-loader.gif'/>");
	dialogElem.append(spinnerEl);
	// leaf node link outs
	var url = "/phylotree_links/"+node.genus+"/"+node.species+"/"+node.feature_name+"/json";
	$.ajax({
          type: "GET",
          url: url,
          success: function(data) {
	    data.reverse();
            _.each(data, function(value, index) {
	      var linkAttr = {
		id : 'feature_link_out_' + index,
		href : value.href,
		text : value.text,
		tabindex: '-1', /* prevent link being hilited by default */
	      };
	      var a = $('<a/>', linkAttr);
	      containerElem.prepend($('<br/>'));
	      containerElem.prepend(a);
            });
	    spinnerEl.remove();
	    containerElem.show();
          },
	});
      }
    }
    
  });
})(jQuery);
