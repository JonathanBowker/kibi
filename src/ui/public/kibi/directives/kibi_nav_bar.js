/*eslint no-use-before-define: 1*/
define(function (require) {
  require('ui/kibi/directives/kibi_nav_bar.less');
  require('ui/kibi/directives/kibi_dashboard_toolbar');
  require('ui/kibi/directives/kibi_stop_click_event');

  require('ui/routes')
  .addSetupWork(function (Private) {
    const kibiNavBarHelper = Private(require('ui/kibi/directives/kibi_nav_bar_helper'));
    return kibiNavBarHelper.init();
  });

  require('ui/modules')
  .get('app/dashboard')
  .directive('kibiNavBar', function ($rootScope, kibiState, config, Private) {
    const urlHelper = Private(require('ui/kibi/helpers/url_helper'));
    const ResizeChecker = Private(require('ui/vislib/lib/resize_checker'));
    const kibiNavBarHelper = Private(require('ui/kibi/directives/kibi_nav_bar_helper'));

    return {
      restrict: 'E',
      // Note: does not require dashboardApp as the st-nav-bar is placed outside of dashboardApp
      scope: {
        chrome: '='
      },
      template: require('ui/kibi/directives/kibi_nav_bar.html'),
      link: function ($scope, $el) {

        kibiNavBarHelper.setChrome($scope.chrome);
        $scope.dashboardGroups = kibiNavBarHelper.getDashboardGroups();

        var removeLocationChangeSuccessHandler = $rootScope.$on('$locationChangeSuccess', function () {
          urlHelper.onDashboardTab() ? $el.show() : $el.hide();
        });

        $scope.relationalFilterVisible = false;
        var removeInitConfigHandler = $rootScope.$on('init:config', function () {
          $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
        });

        var removeRelationalPanelHandler = $rootScope.$on('change:config.kibi:relationalPanel', function () {
          $scope.relationalFilterVisible = config.get('kibi:relationalPanel');
        });

        $scope.relationalFilterPanelOpened = false;

        $scope.openRelationalFilterPanel = function () {
          $scope.relationalFilterPanelOpened = !$scope.relationalFilterPanelOpened;
          $rootScope.$emit('relationalFilterPanelOpened', $scope.relationalFilterPanelOpened);
        };

        var removeRelationalFilterPanelClosedHandler = $rootScope.$on('relationalFilterPanelClosed', function () {
          $scope.relationalFilterPanelOpened = false;
        });

        // close panel when user navigates to a different route
        var removeRouteChangeSuccessHandler = $rootScope.$on('$routeChangeSuccess', function (event, next, prev, err) {
          if (!next.locals.dash) {
            // only if we switched to a non dashboard page
            $rootScope.$emit('relationalFilterPanelOpened', false);
            $scope.relationalFilterPanelOpened = false;
          }
        });

        // =============
        // Tab scrolling
        // =============

        var tabContainer = $el.find('.tab-container');
        $scope.tabResizeChecker = new ResizeChecker(tabContainer);
        $scope.tabScrollerState = [true, false];

        var updateTabScroller = function () {
          var sl = tabContainer.scrollLeft();
          $scope.tabScrollerState[0] = sl === 0;
          $scope.tabScrollerState[1] = sl === tabContainer[0].scrollWidth - tabContainer[0].clientWidth;
        };

        $scope.onTabContainerResize = function () {
          if (tabContainer[0].offsetWidth < tabContainer[0].scrollWidth) {
            $el.find('.tab-scroller').addClass('visible');
          } else {
            $el.find('.tab-scroller').removeClass('visible');
          }
          updateTabScroller();
        };

        $scope.tabResizeChecker.on('resize', $scope.onTabContainerResize);

        var amount = 90;
        var stopScrolling = false;

        function scroll(direction, amount) {
          var scrollLeft = tabContainer.scrollLeft() - direction * amount;
          tabContainer.animate({scrollLeft: scrollLeft}, 250, 'linear', function () {
            if (!stopScrolling) {
              scroll(direction, amount * 1.75);
            }
            updateTabScroller();
          });
        }

        $scope.scrollTabs = function (direction) {
          if (direction === false) {
            stopScrolling = true;
            tabContainer.stop();
            updateTabScroller();
            return;
          }
          stopScrolling = false;
          scroll(direction, amount);
          updateTabScroller();
        };

        // rerender tabs if any dashboard got saved
        var removeDashboardChangedHandler = $rootScope.$on('kibi:dashboard:changed', function (event, dashId) {
          updateTabScroller();
          kibiNavBarHelper.computeDashboardsGroups('Dashboard changed')
          .then(() => kibiNavBarHelper.updateAllCounts([ dashId ], 'kibi:dashboard:changed event'));
        });

        $scope.$watch(function (scope) {
          return kibiState._getCurrentDashboardId();
        }, (currentDashboardId) => {
          if (currentDashboardId) {
            kibiNavBarHelper.computeDashboardsGroups('current dashboard changed');
          }
        });

        var removeDashboardGroupChangedHandler = $rootScope.$on('kibi:dashboardgroup:changed', function () {
          updateTabScroller();
          kibiNavBarHelper.computeDashboardsGroups('Dashboard group changed');
        });

        $scope.$on('$destroy', function () {
          kibiNavBarHelper.destroy();
          removeRouteChangeSuccessHandler();
          removeDashboardGroupChangedHandler();
          removeInitConfigHandler();
          removeRelationalFilterPanelClosedHandler();
          removeDashboardChangedHandler();
          removeLocationChangeSuccessHandler();
          removeRelationalPanelHandler();

          $scope.tabResizeChecker.off('resize', $scope.onTabContainerResize);
          $scope.tabResizeChecker.destroy();
          tabContainer = null;
        });
      }

    };
  });

});
