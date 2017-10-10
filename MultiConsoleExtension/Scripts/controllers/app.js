//var contextMenuClickedFor = "";

(function (angular) {
    var ngContextMenu = angular.module('directive.contextMenu', []);
    ngContextMenu.directive('cellHighlight', function () {
        return {
            restrict: 'C',
            link: function postLink(scope, iElement, iAttrs) {
                iElement.find('td')
                  .mouseover(function () {
                      $(this).parent('tr').css('opacity', '0.7');
                  }).mouseout(function () {
                      $(this).parent('tr').css('opacity', '1.0');
                  });
            }
        };
    });

    ngContextMenu.directive('context', [

      function () {
          return {
              restrict: 'A',
              scope: '@&',
              compile: function compile(tElement, tAttrs, transclude) {
                  return {
                      post: function postLink(scope, iElement, iAttrs, controller) {
                          var ul = $('#' + iAttrs.context),
                            last = null;
                          eventFor = "";
                          ul.css({
                              'display': 'none'
                          });




                          $(iElement).bind('contextmenu', function (event) {

                              console.log("Log from app.js contextMenu");
                              //contextMenuClickedFor = event.currentTarget;
                              if (!scope.$$phase) {
                                  scope.$apply();
                              }

                              //This is to pass back to the controller as to which row was the right clicked on
                              ul.find("li").each(function () {
                                  if (this.id != "") {
                                      $('#' + this.id).attr('parentRowId', event.currentTarget.id);
                                  }
                              });

                              //This function takes care of setting up the individual menu elements for this row
                              scope.contextMenuSetup(event.currentTarget.id);

                              ul.css({
                                  position: "fixed",
                                  display: "block",
                                  left: event.clientX + 'px',
                                  top: event.clientY - ((ul.height())+15) + 'px'
                              });
                              //console.log(scope.contextMenuState);
                              

                              last = event.timeStamp;
                              event.preventDefault();
                          });
                          //$(iElement).click(function(event) {
                          //  ul.css({
                          //    position: "fixed",
                          //    display: "block",
                          //    left: event.clientX + 'px',
                          //    top: event.clientY + 'px'
                          //  });
                          //  last = event.timeStamp;
                          //});

                          $(document).click(function (event) {
                              var target = $(event.target);
                              if (!target.is(".popover") && !target.parents().is(".popover")) {
                                  if (last === event.timeStamp)
                                      return;
                                  ul.css({
                                      'display': 'none'
                                  });
                              }
                          });
                      }
                  };
              }
          };
      }
    ]);
})(window.angular);