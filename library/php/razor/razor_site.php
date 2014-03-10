<?php if (!defined("RAZOR_BASE_PATH")) die("No direct script access to this content");

/**
 * Razor Page Class - Used to render the public facing website
 *
 * @author Paul Smith
 * @date Feb 2014
 * @path lib/razor_page.php
 */

class RazorSite
{
	private $link = null;
    private $site = null;
    private $page = null;
    private $menu = null;
    private $content = null;
    private $admin = false;

    function __construct()
    {
        // generate path from get
        $this->link = (isset($_GET["path"]) ? preg_replace("/[^a-z0-9_.\/-]/", '', strtolower($_GET["path"])) : null);
    }

    public function load()
    {
        // load data
        $this->get_site_data();
        $this->get_page_data();
        $this->get_menu_data();
        $this->get_content_data();
    }

    public function render()
    {
        // is 404 ?
        if (empty($this->page) || (!isset($_COOKIE["token"]) && !$this->page["active"]))
        { 
            include_once(RAZOR_BASE_PATH."theme/view/404.php");
            return;
        }

        // if default not chosen, load manifest
        if (!empty($this->page["theme"]))
        {
            $manifest = RazorFileTools::read_file_contents(RAZOR_BASE_PATH."extension/theme/{$this->page["theme"]}", "json");
            $view_path = RAZOR_BASE_PATH."extension/theme/{$manifest->handle}/{$manifest->theme}/view/{$manifest->layout}.php";

            if (is_file($view_path)) include_once($view_path);
        }
        else include_once(RAZOR_BASE_PATH."theme/view/default.php");
    }

    public function content($loc, $col)
    {
        // admin angluar loading for editor, return
        if (!isset($_GET["preview"]) && ($this->admin || isset($_COOKIE["token"])))
        {
            echo <<<OUTPUT
<div class="content-column" ng-class="{'edit': toggle}">
    <div class="content-block" ng-class="{'active': editingThis('{$loc}{$col}' + block.content_id)}" ng-repeat="block in locations.{$loc}.{$col}">
        <input type="text" class="form-control" placeholder="Add Content Name" ng-show="toggle" ng-model="content[block.content_id].name"/>
        
        <div id="view-{$loc}{$col}{{block.content_id}}" class="content-view" ng-hide="editingThis('{$loc}{$col}' + block.content_id)" ng-click="startBlockEdit('{$loc}{$col}',  block.content_id)" ng-bind-html="bindHtml(content[block.content_id].content)"></div>
        <textarea id="{$loc}{$col}{{block.content_id}}" height="800px" ng-show="editingThis('{$loc}{$col}' + block.content_id)" class="content-edit" ng-model="content[block.content_id].content" style="width:100%;"></textarea>

        <div class="btn-toolbar" role="toolbar">
            <div class="btn-group">
                <button class="btn btn-default" ng-click="locations.{$loc}.{$col}.splice(\$index - 1, 0, locations.{$loc}.{$col}.splice(\$index, 1)[0])" ng-show="toggle"><i class="fa fa-arrow-up"></i></button>
                <button class="btn btn-default" ng-click="locations.{$loc}.{$col}.splice(\$index + 1, 0, locations.{$loc}.{$col}.splice(\$index, 1)[0])" ng-show="toggle"><i class="fa fa-arrow-down"></i></button>
            </div>
            <div class="btn-group pull-right">
                <button class="btn btn-warning" ng-show="toggle" ng-click="locations.{$loc}.{$col}.splice(\$index, 1)"><i class="fa fa-times"></i></button>
            </div>
        </div>
    </div>
    <button class="btn btn-default" ng-show="toggle" ng-click="addNewBlock('{$loc}', '{$col}')"><i class="fa fa-plus"></i></button>
    <button class="btn btn-default" ng-show="toggle" ng-click="findBlock('{$loc}', '{$col}')"><i class="fa fa-search"></i></button>
</div>
OUTPUT;
            return;
        }

        // empty, return
        if (empty($this->content)) return;
        
        // if not editor and not empty, output content for public
        foreach ($this->content as $c_data)
        {
            if ($c_data["location"] == $loc && $c_data["column"] == $col)
            {
                echo '<div content-id="'.$c_data["content_id"].'">';
                echo $c_data["content_id.content"];
                echo '</div>';
            }
        }
    }

    public function menu($loc)
    {
        // admin angluar loading for editor, return
        if (!isset($_GET["preview"]) && ($this->admin || isset($_COOKIE["token"])))
        {
            echo <<<OUTPUT
<li ng-class="{'active': linkIsActive(mi.page_id)}" ng-repeat="mi in menus.{$loc}.menu_items" ng-if="!toggle">
    <a ng-href="{{getMenuLink(mi.page_link)}}">
        <i class="fa fa-eye-slash" ng-hide="mi.page_active"></i>
        {{mi.page_name}}
    </a>
</li>

<li class="dropdown editable-menu-link" ng-class="{'active': linkIsActive(mi.page_id)}" ng-repeat="mi in menus.{$loc}.menu_items" ng-if="toggle">
    <a class="dropdown-toggle editable-menu-anchor">
        <i class="fa fa-eye-slash" ng-hide="mi.page_active"></i>
        {{mi.page_name}}
        <i class="fa fa-caret-down"></i>
    </a>
    <ul class="dropdown-menu editable-menu-options">
        <li ng-click="menus.{$loc}.menu_items.splice(\$index - 1, 0, menus.{$loc}.menu_items.splice(\$index, 1)[0])" ><button class="btn btn-default"><i class="fa fa-arrow-up"></i></button></li>
        <li ng-click="menus.{$loc}.menu_items.splice(\$index + 1, 0, menus.{$loc}.menu_items.splice(\$index, 1)[0])"><button class="btn btn-default"><i class="fa fa-arrow-down"></i></button></li>
        <li ng-click="menus.{$loc}.menu_items.splice(\$index, 1)"><button class="btn btn-default"><i class="fa fa-times"></i></button></li>
    </ul>
</li>

<li ng-show="toggle"><a href="#" ng-click="findMenuItem('{$loc}')"><i class="fa fa-list"></i></a></li>
OUTPUT;
            return;
        }

        // empty, return
        if (!isset($this->menu[$loc])) return;

        // else carry on with nromal php loading
        foreach ($this->menu[$loc] as $m_item)
        {
            if (!empty($m_item["page_id"]) && ($m_item["page_id.active"] || isset($_COOKIE["token"])))
            {
                $show_eye = (!$m_item["page_id.active"] && isset($_COOKIE["token"]) ? '<i class="fa fa-eye-slash"></i> ' : "");
                echo '<li'.($m_item["page_id"] == $this->page["id"] ? ' class="active"' : '').'>';
                echo '<a href="'.RAZOR_BASE_URL.$m_item["page_id.link"].'">'.$show_eye.$m_item["page_id.name"].'</a></li>';   
            }
        }
    }

    public function data_main()
    {
        if (isset($_GET["preview"]) || (!$this->admin && !isset($_COOKIE["token"]))) return;
        echo 'data-main="admin"';
    }

    public function body()
    {
        if (isset($_GET["preview"]) || (!$this->admin && !isset($_COOKIE["token"])))
        {
            echo "<body>";
            return;
        }

        include(RAZOR_BASE_PATH."theme/partial/admin-main.html");
        return true;
    }

    private function get_site_data()
    {
        $db = new RazorDB();
        $db->connect("site");
        $res = $db->get_rows(array("column" => "id", "value" => 1));
        $db->disconnect(); 

        $this->site = $res["result"][0];
    }

    private function get_page_data()
    {
        // check for admin flag
        if ($this->link == "admin")
        {
            $this->link = null;
            $this->admin = true;
        }

        $db = new RazorDB();
        $db->connect("page");
        $search = (empty($this->link) ? array("column" => "id", "value" => $this->site["home_page"]) : array("column" => "link", "value" => $this->link));
        $res = $db->get_rows($search);
        $db->disconnect(); 

        $this->page = ($res["count"] == 1 ? $res["result"][0] : null);
    }

    private function get_menu_data()
    {
        // if no page found, end here
        if (empty($this->page)) return;

        // collate all menus (to cut down on duplicate searches)
        $this->menu = array();

        $db = new RazorDB();
        $db->connect("menu_item");

        // set options
        $options = array(
            "join" => array(array("table" => "page", "join_to" => "page_id"), array("table" => "menu", "join_to" => "menu_id")),
            "order" => array("column" => "position", "direction" => "asc")
        );

        // get all menu_links
        $menus = $db->get_rows(array("column" => "id", "not" => true, "value" => null), $options)["result"];

        // sort them into name
        foreach ($menus as $menu)
        {
            if (!isset($this->menu[$menu["menu_id.name"]])) $this->menu[$menu["menu_id.name"]] = array();
            $this->menu[$menu["menu_id.name"]][] = $menu;    
        }
        
        $db->disconnect();
    }

    private function get_content_data()
    {
        // if no page found, end here
        if (empty($this->page)) return;

        // grab all content
        $db = new RazorDB();
        $db->connect("page_content");

        // set options
        $options = array(
            "join" => array("table" => "content", "join_to" => "content_id"),
            "order" => array("column" => "position", "direction" => "asc")
        );

        $search = array("column" => "page_id", "value" => $this->page["id"]);

        $this->content = $db->get_rows($search, $options)["result"];
        $db->disconnect(); 
    }
}
/* EOF */