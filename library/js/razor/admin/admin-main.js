define(["angular", "cookie-monster", "nicedit", "ui-bootstrap"], function(angular, monster, nicedit)
{
    angular.module("razor.admin.main", ['ui.bootstrap'])

    .controller("main", function($scope, $location, rars, $modal, $sce, $timeout, $rootScope, $http)
    {
        $scope.location = $location;
        $scope.user = null;
        $scope.loginDetails = {"u": null, "p": null};
        $scope.editorInstance = null;
        $scope.editing = {"handle": null, "id": null, "code": null};
        $scope.toggle = null;
        $scope.changed = null;
        $scope.dash = null;

        $scope.site = null;
        $scope.content = null;
        $scope.locations = null;
        $scope.page = null;
        $scope.menu = null;

        $scope.init = function()
        {
            $scope.loginCheck();
            
            // nav active watcher
            $scope.$watch("location.path()", function(path)
            {
                $scope.activePage = path.substring(1);
            });

            $scope.loadPage();
        };

        $scope.login = function()
        {
            if ($scope.forgotLogin)
            {
                $scope.loading = true;

                rars.post("user/reminder", {"email": $scope.loginDetails.u})
                    .success(function(data)
                    {
                        $rootScope.$broadcast("global-notification", {"type": "success", "text": "Password reset link emailed, you have one hour to use link."});
                        $scope.loading = false;
                    })
                    .error(function(data, header) 
                    {
                        $rootScope.$broadcast("global-notification", {"type": "success", "text": "Could not send password request, user not found or too many requests in last ten minutes."});
                        $scope.loading = false;
                    }
                );
            }
            else
            {
                $scope.loading = true;

                rars.post("login", $scope.loginDetails).success(function(data)
                {
                    if (!!data.user)
                    {
                        // save cookie and redirect user based on access level
                        monster.set("token", data.token, null, "/");
                        $scope.user = data.user;
                        $scope.showLogin = false;
                        $scope.loading = false;
                        window.location.href = RAZOR_BASE_URL + "#page";
                    }
                    else
                    {
                        // clear token and user
                        monster.remove("token");

                        $scope.showLogin = true;
                        $scope.loading = false;

                        if (data.login_error_code == 101) $rootScope.$broadcast("global-notification", {"type": "danger", "text": "Login failed."});
                        if (data.login_error_code == 102) $rootScope.$broadcast("global-notification", {"type": "danger", "text": "You have been locked out, try again in " + (!!data.time_left ? Math.ceil(data.time_left / 60) : 0) + "min."});
                        if (data.login_error_code == 103) $rootScope.$broadcast("global-notification", {"type": "danger", "text": "Account not activated, click link in activation email to activate."});
                        if (data.login_error_code == 104) $rootScope.$broadcast("global-notification", {"type": "danger", "text": "Too many failed attempts, your IP has been banned."});
                    }
                });
            }
        };

    	$scope.loginCheck = function()
        {
            rars.get("user/basic", "current", monster.get("token")).success(function(data)
            {
                if (!!data.user)
                {
                    $scope.user = data.user;
                    $scope.loggedIn = true;
                    $scope.showLogin = false;
                }
                else
                {
                    // clear token and user
                    monster.remove("token");
                    $scope.user = null;
                    $scope.loggedIn = false;
                    $scope.showLogin = true;
                }
            });
        };

        $scope.logout = function()
        {
            monster.remove("token");
            $scope.user = null;
            $scope.loggedIn = false;
            window.location.href = RAZOR_BASE_URL;
        };

        $scope.loadPage = function()
        {   
            // all available menus
            rars.get("site/editor", "all").success(function(data)
            {
                $scope.site = data.site;
            });

            // grab content for page
            rars.get("content/editor", RAZOR_PAGE_ID).success(function(data)
            {
                $scope.content = (!data.content || data.content.length < 1 ? {} : data.content);
                $scope.locations = (!data.locations || data.locations.length < 1 ? {} : data.locations);
            });

            // grab page data
            rars.get("page/details", RAZOR_PAGE_ID).success(function(data)
            {
                $scope.page = data.page;

                if (!$scope.page.theme) return;

                // load in theme data
                $http.get(RAZOR_BASE_URL + "extension/theme/" + $scope.page.theme).then(function(response) 
                { 
                    $scope.page.themeData = response.data; 
                });
            });

            // all available menus
            rars.get("menu/editor", "all").success(function(data)
            {
                $scope.menus = data.menus;
            });
        };

        $scope.openDash = function()
        {
            $scope.dash = true;
            $scope.location.path('#page');
        };

        $scope.closeDash = function()
        {
            $scope.loadPage();
            $scope.dash = false;
            $scope.location.path('#');
        };

        $scope.bindHtml = function(html)
        {
            // required due to deprecation of html-bind-unsafe
            return $sce.trustAsHtml(html);
        };

        $scope.startEdit = function()
        {
            $scope.toggle = true;
            $scope.changed = true;
        };

        $scope.stopEdit = function()
        {
            // stop any edits
            $scope.stopBlockEdit();

            $scope.toggle = false; 
        };

        $scope.saveEdit = function()
        {
            // stop any edits
            $scope.stopBlockEdit();

            $scope.savedEditContent = false;
            $scope.savedEditContent = false;

            // save all content for page
            rars.post("content/editor", {"locations": $scope.locations, "content": $scope.content, "page_id": RAZOR_PAGE_ID}, monster.get("token")).success(function(data)
            { 
                $scope.savedEditContent = true;
                $scope.saveSuccess();
            });      

            // save all content for page
            rars.post("menu/editor", $scope.menus, monster.get("token")).success(function(data)
            {
                $scope.savedEditMenu = true;
                $scope.saveSuccess();
            });        

            $scope.toggle = false;
            $scope.changed = false; 
        };

        $scope.saveSuccess = function()
        {
            if (!$scope.savedEditContent || !$scope.savedEditMenu) return;

            $rootScope.$broadcast("global-notification", {"type": "success", "text": "Changes saved successfully."});
        };

        $scope.startBlockEdit = function(locCol, content_id)
        {
            if (!$scope.toggle) return;

            // stop any edits
            $scope.stopBlockEdit();

            // load editor
            $scope.editing.handle = locCol + content_id;
            $scope.editing.id = content_id;

            $scope.editorInstance = new nicEditor({fullPanel : true, uploadURI : RAZOR_BASE_URL + "rars/file/image", authToken : monster.get("token")}).panelInstance($scope.editing.handle);
            // hide text-area
            angular.element(document.querySelector("#" + $scope.editing.handle)).addClass("hide");
        };

        $scope.stopBlockEdit = function()
        {
            if (!!$scope.editorInstance) 
            {
                // copy data and end editor
                $scope.content[$scope.editing.id].content = $scope.editorInstance.instanceById($scope.editing.handle).getContent();
                
                // end editor
                $scope.editorInstance.removeInstance($scope.editing.handle);

                // show text-area
                angular.element(document.querySelector("#" + $scope.editing.handle)).removeClass("hide");
            }

            // clear edit stuff
            $scope.editing = {"handle": null, "id": null, "code": null};
            $scope.editorInstance = null;
        };

        $scope.editingThis = function(handle)
        {
            return (handle === $scope.editing.handle ? true : false);
        };

        $scope.toggleEditor = function(locCol, content_id)
        {
            // if swapping from code to editor, restart editor to capture changes 
            if ($scope.editing.code)
            {
                // turn on editor
                $scope.editing.code = false;
                $scope.editorInstance = new nicEditor({fullPanel : true, maxHeight : 500}).panelInstance(locCol + content_id);
                angular.element(document.querySelector("#" + $scope.editing.handle)).addClass("hide");
            }
            else
            {
                // turn editor off
                $scope.editing.code = true;
                $scope.content[$scope.editing.id].content = $scope.editorInstance.instanceById(locCol + content_id).getContent();
                $scope.editorInstance.removeInstance(locCol + content_id);
                $scope.editorInstance = null;
                angular.element(document.querySelector("#" + $scope.editing.handle)).removeClass("hide");
            }
        };

        $scope.addNewBlock = function(loc, col, block)
        {
            // generate new ID
            var id = (!!block ? block.id : "new-" + new Date().getTime());
            var name = (!!block ? block.name : null);
            var content = (!!block ? block.content : null);

            // first add content, then location
            if (!$scope.content) $scope.content = {};
            $scope.content[id] = {"content_id": id, "content": content, "name": name};

            if (!$scope.locations) $scope.locations = {};
            if (!$scope.locations[loc]) $scope.locations[loc] = {};
            if (!$scope.locations[loc][col]) $scope.locations[loc][col] = [];
            $scope.locations[loc][col].push({"id": "new", "content_id": id});
        };

        $scope.findBlock = function(loc, col)
        {
            $modal.open(
            {
                templateUrl: RAZOR_BASE_URL + "theme/partial/modal/content-selection.html",
                controller: "contentListModal"
            }).result.then(function(selected)
            {
                $scope.addNewBlock(loc, col, selected);
            });
        };

        $scope.findMenuItem = function(loc)
        {
            $modal.open(
            {
                templateUrl: RAZOR_BASE_URL + "theme/partial/modal/menu-item-selection.html",
                controller: "menuItemListModal"
            }).result.then(function(selected)
            {
                $scope.menus[loc].menu_items.push({"page_id": selected.id, "page_name": selected.name, "page_link": selected.link, "page_active": selected.active});
            });
        };

        $scope.linkIsActive = function(page_id)
        {
            return page_id == RAZOR_PAGE_ID;
        };

        $scope.getMenuLink = function(link)
        {
            return RAZOR_BASE_URL + link;
        };
    
        $scope.cancelEdit = function()
        {
            $scope.loadPage();
            $scope.changed = null;
            $scope.stopEdit();
        };

        $scope.addNewPage = function(loc)
        {
            $modal.open(
            {
                templateUrl: RAZOR_BASE_URL + "theme/partial/modal/add-new-page.html",
                controller: "addNewPageModal"
            }).result.then(function(redirect)
            {
                if (!!redirect) window.location = RAZOR_BASE_URL + redirect;
            });
        };
    })

    .controller("contentListModal", function($scope, $modalInstance, rars, $sce)
    {
        $scope.oneAtATime = true;

        rars.get("content/list", "all").success(function(data)
        {
            $scope.content = data.content;
        }); 

        $scope.cancel = function()
        {
            $modalInstance.dismiss('cancel');
        };

        $scope.close = function(c)
        {
            $modalInstance.close(c);
        };    

        $scope.addContent = function(c) 
        {
            $scope.close(c);
        }; 

        $scope.loadHTML = function(html)
        {
            return $sce.trustAsHtml(html);
        };
    })

    .controller("menuItemListModal", function($scope, $modalInstance)
    {
        $scope.cancel = function()
        {
            $modalInstance.dismiss('cancel');
        };

        $scope.close = function(item)
        {
            $modalInstance.close(item);
        };    
    })

    .controller("menuItemListAccordion", function($scope, rars)
    {
        $scope.oneAtATime = true;

        // grab content list
        rars.get("page/list", "all").success(function(data)
        {
            $scope.pages = data.pages;
        }); 

        $scope.addMenuItem = function(item) {
            $scope.$parent.close(item);
        };    

        $scope.loadPreview = function(link)
        {
            return RAZOR_BASE_URL + link + "?preview";
        };
    })

    .controller("addNewPageModal", function($scope, $modalInstance, rars, $rootScope)
    {
        $scope.page = {};
        $scope.processing = null;
        $scope.completed = null;
        $scope.newPage = null;

        $scope.cancel = function()
        {
            $modalInstance.dismiss();
        };

        $scope.closeAndEdit = function()
        {
            $modalInstance.close($scope.newPage.link);
        };  

        $scope.addAnother = function()
        {
            $scope.completed = null;
            $scope.processing = null;
            $scope.page = {};
        };  

        $scope.saveNewPage = function()
        {
            $scope.processing = true;
            $scope.completed = false;

            rars.post("page/data", $scope.page, monster.get("token")).success(function(data)
            {
                $scope.newPage = data;
                $rootScope.$broadcast("global-notification", {"type": "success", "text": "New page saved successfully."});
                $scope.processing = false;
                $scope.completed = true;
            }).error(function()
            {
                if (!data.code) $rootScope.$broadcast("global-notification", {"type": "danger", "text": "Could not save page, please try again later."});
                else if (data.code == 101) $rootScope.$broadcast("global-notification", {"type": "danger", "text": "Link is not unique, already being used by another page."});
                $scope.processing = false;
            }); 
        };  

    });
});