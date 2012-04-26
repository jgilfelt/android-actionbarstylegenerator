// Based on sample code at http://jqueryui.com/demos/autocomplete/#combobox

(function( $ ) {
  $.widget( "ui.autocompletewithbutton", {
    _create: function() {
      var self = this,
        input = this.element,
        value = input.text();

      input
        .autocomplete($.extend(this.options, {
          select: function( event, ui ) {
            self._trigger( "selected", event, ui.item.value);
          }
        }))
        .addClass( "form-text ui-widget ui-widget-content ui-corner-left " +
                   "ui-autocomplete-input" );

      input.data( "autocomplete" )._renderItem = function( ul, item ) {
        return $( "<li></li>" )
          .data( "item.autocomplete", item )
          .append( "<a>" + item.label + "</a>" )
          .appendTo( ul );
      };

      $( "<button>&nbsp;</button>" )
        .attr( "tabIndex", -1 )
        .attr( "title", "Show All Items" )
        .insertAfter( input )
        .button({
          icons: {
            primary: "ui-icon-triangle-1-s"
          },
          text: false
        })
        .removeClass( "ui-corner-all" )
        .addClass( "ui-corner-right ui-button-icon" )
        .click(function() {
          // close if already visible
          if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
            input.autocomplete( "close" );
            return;
          }

          // pass empty string as value to search for, displaying all results
          input.autocomplete( "search", "" );
          input.focus();
        });
    }
  });
})( jQuery );