<?php
    /* Version 1 */

    /* R.A.R.S. razorCMS Authenticatable Resource Server - smiffy6969 - ulsmith.net */

    // auto defines 
    define("RARS_BASE_PATH", str_replace(array("index.php"), "", $_SERVER["SCRIPT_FILENAME"]));
    define("RARS_BASE_URL", "http://".$_SERVER["SERVER_NAME"].($_SERVER["SERVER_PORT"] == "80" || $_SERVER["SERVER_PORT"] == "8080" ? "" : ":{$_SERVER["SERVER_PORT"]}").str_replace(array("index.php"), "", $_SERVER["SCRIPT_NAME"]));
    define("RAZOR_BASE_PATH", str_replace(array("rars/index.php"), "", $_SERVER["SCRIPT_FILENAME"]));
    define("RAZOR_BASE_URL", "http://".$_SERVER["SERVER_NAME"].($_SERVER["SERVER_PORT"] == "80" || $_SERVER["SERVER_PORT"] == "8080" ? "" : ":{$_SERVER["SERVER_PORT"]}").str_replace(array("rars/index.php"), "", $_SERVER["SCRIPT_NAME"]));

    // security defines
    define("RARS_ACCESS_ATTEMPTS", 5); // how many attempts are allowed before lockout, which will appear on the next attempt, (from 1 to 99) [this can be made longer by altering attemps col type]
    define("RARS_ACCESS_LOCKOUT", 600); // how many seconds to lockout for after above failures detected
    define("RARS_ACCESS_TIMEOUT", 86400); // the amount of time the login will stay alive
    define("RARS_ACCESS_BAN_ATTEMPS", 250); // the amount of atempts an IP can have without a successful login, before being banned completely from logging in, 0 to turn off.
    define("RARS_CLEAN_DATA_ALLOWED_TAGS", "<b><i><h1><h2><h3><h4><h5><h6><p><strong><em><table><thead><tbody><tfooter><tr><th><td><ul><ol><li><a><br><div><header><footer><span><img>"); // will add extra checking to data coming in, checking strings and removing any not listed, comment out to turn off.

    // include error handler
	include_once(RAZOR_BASE_PATH.'library/php/razor/razor_file_tools.php');
	include_once(RAZOR_BASE_PATH.'library/php/razor/razor_error_handler.php');
	include_once(RAZOR_BASE_PATH.'library/php/razor/razor_api.php');
    include_once(RAZOR_BASE_PATH."library/php/razor/razor_db.php");

    // Load error handler
    $error = new RazorErrorHandler();
    set_error_handler(array($error, 'handle_error'));
    set_exception_handler(array($error, 'handle_error'));

    // login function - process login
    if (isset($_GET["login"]))
    {
        $POST = RazorAPI::clean_data((!empty($_POST) ? $_POST : json_decode(file_get_contents('php://input'))));

        if (isset($_GET["u"], $_GET["p"]) || isset($POST["u"], $POST["p"]))
        {
            $u = preg_replace("/[^a-z0-9_.@]/", '', strtolower((isset($POST["u"]) ? $POST["u"] : $_GET["u"])));
            $p = isset($POST["p"]) ? $POST["p"] : $_GET["p"];

            $api = new RazorAPI();
            $api->login(array("username" => $u, "password" => $p));
        }
        else RazorAPI::response(null, null, 400);
        exit();
    }

	// grab method
	$method = preg_replace("/[^a-z]/", '', strtolower($_SERVER["REQUEST_METHOD"]));

    // check for path data to REST classes and grab them
    if (!isset($_GET["path"])) RazorAPI::response(null , null, $code = 404);
    $path_parts = explode("/", strtolower($_GET["path"]));

    $filename = "";
    $classname = "";
    $found = false;
    $c = 0;
    foreach ($path_parts as $pp)
    {
        $c++;
        $filename.= "/".preg_replace("/[^a-z0-9_]/", '', strtolower($pp));
        $classname.= ucfirst(preg_replace("/[^a-z0-9_]/", '', strtolower($pp)));  
        if (is_file(RARS_BASE_PATH."api{$filename}.php"))
        {
            $found = true;
            break;
        }
    }

    if (!$found) RazorAPI::response(null , null, $code = 404);
   
    // grab any data or id's data
    if ($method == "delete" || $method == "get")
    {
        $data = (count($path_parts) == $c + 1 ? RazorAPI::clean_data($path_parts[$c]) : (count($path_parts) == $c + 2 ? RazorAPI::clean_data($path_parts[$c + 1]) : null));
    }
    else $data = RazorAPI::clean_data((!empty($_POST) ? $_POST : json_decode(file_get_contents('php://input'))));

    // load resource or throw error
	include(RARS_BASE_PATH."api{$filename}.php");
	$resource = new $classname();
	if (!method_exists($resource, $method)) RazorAPI::response(null, null, $code = 405);
	$response = $resource->$method($data);

/* EOF */