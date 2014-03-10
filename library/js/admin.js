require([
	"angular",
	"angular-route", 
	"razor/services/rars", 
	"razor/directives/form-controls", 
	"razor/directives/notification", 
	"razor/directives/validation",
	"razor/admin/admin-main", 
	"razor/admin/admin-settings", 
	"razor/admin/admin-page", 
	"razor/admin/admin-pages", 
	"razor/admin/admin-content", 
	"razor/admin/admin-profile"
], function(angular)
{
    angular.module("razor.admin", [
    	"ngRoute",
    	"razor.services.rars", 
    	"razor.directives.formControls", 
    	"razor.directives.notification", 
    	"razor.directives.validation", 
    	"razor.admin.main",
    	"razor.admin.settings", 
    	"razor.admin.page", 
    	"razor.admin.pages", 
    	"razor.admin.content", 
    	"razor.admin.profile"
    ])

	.config(['$routeProvider', function($routeProvider) {
	    $routeProvider
	    .when('/page', {templateUrl: RAZOR_BASE_URL + 'theme/partial/admin-page.html', controller: "page"})
	    .when('/pages', {templateUrl: RAZOR_BASE_URL + 'theme/partial/admin-pages.html', controller: "pages"})
	    .when('/content', {templateUrl: RAZOR_BASE_URL + 'theme/partial/admin-content.html', controller: "content"})
	    .when('/profile', {templateUrl: RAZOR_BASE_URL + 'theme/partial/admin-profile.html', controller: "profile"})
	    .when('/settings', {templateUrl: RAZOR_BASE_URL + 'theme/partial/admin-settings.html', controller: "settings"})
	    .otherwise({redirectTo: '/page'});
	}]);

    angular.bootstrap(document.getElementById("razor-admin"), ["razor.admin"]); // Necessary because the Angular files are being loading asynchronously
});