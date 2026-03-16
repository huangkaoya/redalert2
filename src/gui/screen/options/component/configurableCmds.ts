import { KeyCommandType } from "@/gui/screen/game/worldInteraction/keyboard/KeyCommandType";
interface Strings {
    get(key: string, ...args: any[]): string;
}
interface CommandConfig {
    label: string | ((strings: Strings) => string);
    desc: string | ((strings: Strings) => string);
}
export const configurableCmds = new Map<KeyCommandType, CommandConfig>([
    [
        KeyCommandType.Options,
        { label: "txt_options", desc: "txt_options_desc" },
    ],
    [
        KeyCommandType.ToggleAlliance,
        { label: "txt_alliance", desc: "txt_alliance_desc" },
    ],
    [
        KeyCommandType.PlaceBeacon,
        { label: "txt_place_beacon", desc: "txt_place_beacon_desc" },
    ],
    [
        KeyCommandType.AllToCheer,
        { label: "cmnd:allcheer", desc: "cmnd:allcheerdesc" },
    ],
    [
        KeyCommandType.DeployObject,
        { label: "txt_deploy_object", desc: "txt_deploy_object_desc" },
    ],
    [
        KeyCommandType.Follow,
        { label: "txt_follow", desc: "txt_follow_desc" },
    ],
    [
        KeyCommandType.GuardObject,
        { label: "txt_guard", desc: "txt_guard_desc" },
    ],
    [
        KeyCommandType.StopObject,
        { label: "txt_stop_object", desc: "txt_stop_object_desc" },
    ],
    [
        KeyCommandType.ScatterObject,
        { label: "txt_scatter", desc: "txt_scatter_desc" },
    ],
    [
        KeyCommandType.CenterBase,
        { label: "txt_center_base", desc: "txt_center_base_desc" },
    ],
    [
        KeyCommandType.ToggleRepair,
        { label: "txt_repair_mode", desc: "txt_repair_mode_desc" },
    ],
    [
        KeyCommandType.ToggleSell,
        { label: "txt_sell_mode", desc: "txt_sell_mode_desc" },
    ],
    [
        KeyCommandType.PreviousObject,
        { label: "txt_prev_object", desc: "txt_prev_object_desc" },
    ],
    [
        KeyCommandType.NextObject,
        { label: "txt_next_object", desc: "txt_next_object_desc" },
    ],
    [
        KeyCommandType.TypeSelect,
        { label: "cmnd:typeselect", desc: "cmnd:typeselectdesc" },
    ],
    [
        KeyCommandType.CombatantSelect,
        {
            label: "cmnd:combatantselect",
            desc: "cmnd:combatantselectdesc",
        },
    ],
    [
        KeyCommandType.StructureTab,
        { label: "txt_structure_tab", desc: "txt_structure_tab_desc" },
    ],
    [
        KeyCommandType.DefenseTab,
        { label: "txt_defense_tab", desc: "txt_defense_tab_desc" },
    ],
    [
        KeyCommandType.InfantryTab,
        { label: "txt_infantry_tab", desc: "txt_infantry_tab_desc" },
    ],
    [
        KeyCommandType.UnitTab,
        { label: "txt_unit_tab", desc: "txt_unit_tab_desc" },
    ],
    [
        KeyCommandType.PlanningMode,
        { label: "cmnd:planningmode", desc: "cmnd:planningmodedesc" },
    ],
    [
        KeyCommandType.CenterOnRadarEvent,
        { label: "txt_radar_event", desc: "txt_radar_event_desc" },
    ],
    [
        KeyCommandType.HealthNav,
        {
            label: "cmnd:healthnavigation",
            desc: "cmnd:healthnavigationdesc",
        },
    ],
    [
        KeyCommandType.VeterancyNav,
        { label: "cmnd:vetnavigation", desc: "cmnd:vetnavigationdesc" },
    ],
    [
        KeyCommandType.TeamSelect_1,
        {
            label: (e) => e.get("txt_select_team", 1),
            desc: (e) => e.get("txt_select_team_desc", 1),
        },
    ],
    [
        KeyCommandType.TeamSelect_2,
        {
            label: (e) => e.get("txt_select_team", 2),
            desc: (e) => e.get("txt_select_team_desc", 2),
        },
    ],
    [
        KeyCommandType.TeamSelect_3,
        {
            label: (e) => e.get("txt_select_team", 3),
            desc: (e) => e.get("txt_select_team_desc", 3),
        },
    ],
    [
        KeyCommandType.TeamSelect_4,
        {
            label: (e) => e.get("txt_select_team", 4),
            desc: (e) => e.get("txt_select_team_desc", 4),
        },
    ],
    [
        KeyCommandType.TeamSelect_5,
        {
            label: (e) => e.get("txt_select_team", 5),
            desc: (e) => e.get("txt_select_team_desc", 5),
        },
    ],
    [
        KeyCommandType.TeamSelect_6,
        {
            label: (e) => e.get("txt_select_team", 6),
            desc: (e) => e.get("txt_select_team_desc", 6),
        },
    ],
    [
        KeyCommandType.TeamSelect_7,
        {
            label: (e) => e.get("txt_select_team", 7),
            desc: (e) => e.get("txt_select_team_desc", 7),
        },
    ],
    [
        KeyCommandType.TeamSelect_8,
        {
            label: (e) => e.get("txt_select_team", 8),
            desc: (e) => e.get("txt_select_team_desc", 8),
        },
    ],
    [
        KeyCommandType.TeamSelect_9,
        {
            label: (e) => e.get("txt_select_team", 9),
            desc: (e) => e.get("txt_select_team_desc", 9),
        },
    ],
    [
        KeyCommandType.TeamSelect_10,
        {
            label: (e) => e.get("txt_select_team", 10),
            desc: (e) => e.get("txt_select_team_desc", 10),
        },
    ],
    [
        KeyCommandType.TeamCreate_1,
        {
            label: (e) => e.get("txt_create_team", 1),
            desc: (e) => e.get("txt_create_team_desc", 1),
        },
    ],
    [
        KeyCommandType.TeamCreate_2,
        {
            label: (e) => e.get("txt_create_team", 2),
            desc: (e) => e.get("txt_create_team_desc", 2),
        },
    ],
    [
        KeyCommandType.TeamCreate_3,
        {
            label: (e) => e.get("txt_create_team", 3),
            desc: (e) => e.get("txt_create_team_desc", 3),
        },
    ],
    [
        KeyCommandType.TeamCreate_4,
        {
            label: (e) => e.get("txt_create_team", 4),
            desc: (e) => e.get("txt_create_team_desc", 4),
        },
    ],
    [
        KeyCommandType.TeamCreate_5,
        {
            label: (e) => e.get("txt_create_team", 5),
            desc: (e) => e.get("txt_create_team_desc", 5),
        },
    ],
    [
        KeyCommandType.TeamCreate_6,
        {
            label: (e) => e.get("txt_create_team", 6),
            desc: (e) => e.get("txt_create_team_desc", 6),
        },
    ],
    [
        KeyCommandType.TeamCreate_7,
        {
            label: (e) => e.get("txt_create_team", 7),
            desc: (e) => e.get("txt_create_team_desc", 7),
        },
    ],
    [
        KeyCommandType.TeamCreate_8,
        {
            label: (e) => e.get("txt_create_team", 8),
            desc: (e) => e.get("txt_create_team_desc", 8),
        },
    ],
    [
        KeyCommandType.TeamCreate_9,
        {
            label: (e) => e.get("txt_create_team", 9),
            desc: (e) => e.get("txt_create_team_desc", 9),
        },
    ],
    [
        KeyCommandType.TeamCreate_10,
        {
            label: (e) => e.get("txt_create_team", 10),
            desc: (e) => e.get("txt_create_team_desc", 10),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_1,
        {
            label: (e) => e.get("txt_add_select_team", 1),
            desc: (e) => e.get("txt_add_select_team_desc", 1),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_2,
        {
            label: (e) => e.get("txt_add_select_team", 2),
            desc: (e) => e.get("txt_add_select_team_desc", 2),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_3,
        {
            label: (e) => e.get("txt_add_select_team", 3),
            desc: (e) => e.get("txt_add_select_team_desc", 3),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_4,
        {
            label: (e) => e.get("txt_add_select_team", 4),
            desc: (e) => e.get("txt_add_select_team_desc", 4),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_5,
        {
            label: (e) => e.get("txt_add_select_team", 5),
            desc: (e) => e.get("txt_add_select_team_desc", 5),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_6,
        {
            label: (e) => e.get("txt_add_select_team", 6),
            desc: (e) => e.get("txt_add_select_team_desc", 6),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_7,
        {
            label: (e) => e.get("txt_add_select_team", 7),
            desc: (e) => e.get("txt_add_select_team_desc", 7),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_8,
        {
            label: (e) => e.get("txt_add_select_team", 8),
            desc: (e) => e.get("txt_add_select_team_desc", 8),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_9,
        {
            label: (e) => e.get("txt_add_select_team", 9),
            desc: (e) => e.get("txt_add_select_team_desc", 9),
        },
    ],
    [
        KeyCommandType.TeamAddSelect_10,
        {
            label: (e) => e.get("txt_add_select_team", 10),
            desc: (e) => e.get("txt_add_select_team_desc", 10),
        },
    ],
    [
        KeyCommandType.TeamCenter_1,
        {
            label: (e) => e.get("txt_center_team", 1),
            desc: (e) => e.get("txt_center_team_desc", 1),
        },
    ],
    [
        KeyCommandType.TeamCenter_2,
        {
            label: (e) => e.get("txt_center_team", 2),
            desc: (e) => e.get("txt_center_team_desc", 2),
        },
    ],
    [
        KeyCommandType.TeamCenter_3,
        {
            label: (e) => e.get("txt_center_team", 3),
            desc: (e) => e.get("txt_center_team_desc", 3),
        },
    ],
    [
        KeyCommandType.TeamCenter_4,
        {
            label: (e) => e.get("txt_center_team", 4),
            desc: (e) => e.get("txt_center_team_desc", 4),
        },
    ],
    [
        KeyCommandType.TeamCenter_5,
        {
            label: (e) => e.get("txt_center_team", 5),
            desc: (e) => e.get("txt_center_team_desc", 5),
        },
    ],
    [
        KeyCommandType.TeamCenter_6,
        {
            label: (e) => e.get("txt_center_team", 6),
            desc: (e) => e.get("txt_center_team_desc", 6),
        },
    ],
    [
        KeyCommandType.TeamCenter_7,
        {
            label: (e) => e.get("txt_center_team", 7),
            desc: (e) => e.get("txt_center_team_desc", 7),
        },
    ],
    [
        KeyCommandType.TeamCenter_8,
        {
            label: (e) => e.get("txt_center_team", 8),
            desc: (e) => e.get("txt_center_team_desc", 8),
        },
    ],
    [
        KeyCommandType.TeamCenter_9,
        {
            label: (e) => e.get("txt_center_team", 9),
            desc: (e) => e.get("txt_center_team_desc", 9),
        },
    ],
    [
        KeyCommandType.TeamCenter_10,
        {
            label: (e) => e.get("txt_center_team", 10),
            desc: (e) => e.get("txt_center_team_desc", 10),
        },
    ],
    [
        KeyCommandType.CenterView,
        { label: "txt_center_view", desc: "txt_center_view_desc" },
    ],
    [
        KeyCommandType.View1,
        {
            label: "txt_view_bookmark1",
            desc: "txt_view_bookmark1_desc",
        },
    ],
    [
        KeyCommandType.View2,
        {
            label: "txt_view_bookmark2",
            desc: "txt_view_bookmark2_desc",
        },
    ],
    [
        KeyCommandType.View3,
        {
            label: "txt_view_bookmark3",
            desc: "txt_view_bookmark3_desc",
        },
    ],
    [
        KeyCommandType.View4,
        {
            label: "txt_view_bookmark4",
            desc: "txt_view_bookmark4_desc",
        },
    ],
    [
        KeyCommandType.SetView1,
        { label: "txt_set_bookmark1", desc: "txt_set_bookmark1_desc" },
    ],
    [
        KeyCommandType.SetView2,
        { label: "txt_set_bookmark2", desc: "txt_set_bookmark2_desc" },
    ],
    [
        KeyCommandType.SetView3,
        { label: "txt_set_bookmark3", desc: "txt_set_bookmark3_desc" },
    ],
    [
        KeyCommandType.SetView4,
        { label: "txt_set_bookmark4", desc: "txt_set_bookmark4_desc" },
    ],
    [
        KeyCommandType.Taunt_1,
        {
            label: (e) => e.get("txt_taunt_number", 1),
            desc: (e) => e.get("txt_taunt_desc", 1),
        },
    ],
    [
        KeyCommandType.Taunt_2,
        {
            label: (e) => e.get("txt_taunt_number", 2),
            desc: (e) => e.get("txt_taunt_desc", 2),
        },
    ],
    [
        KeyCommandType.Taunt_3,
        {
            label: (e) => e.get("txt_taunt_number", 3),
            desc: (e) => e.get("txt_taunt_desc", 3),
        },
    ],
    [
        KeyCommandType.Taunt_4,
        {
            label: (e) => e.get("txt_taunt_number", 4),
            desc: (e) => e.get("txt_taunt_desc", 4),
        },
    ],
    [
        KeyCommandType.Taunt_5,
        {
            label: (e) => e.get("txt_taunt_number", 5),
            desc: (e) => e.get("txt_taunt_desc", 5),
        },
    ],
    [
        KeyCommandType.Taunt_6,
        {
            label: (e) => e.get("txt_taunt_number", 6),
            desc: (e) => e.get("txt_taunt_desc", 6),
        },
    ],
    [
        KeyCommandType.Taunt_7,
        {
            label: (e) => e.get("txt_taunt_number", 7),
            desc: (e) => e.get("txt_taunt_desc", 7),
        },
    ],
    [
        KeyCommandType.Taunt_8,
        {
            label: (e) => e.get("txt_taunt_number", 8),
            desc: (e) => e.get("txt_taunt_desc", 8),
        },
    ],
    [
        KeyCommandType.Delete,
        { label: "cmnd:delete", desc: "cmnd:deletedesc" },
    ],
    [
        KeyCommandType.PageUser,
        { label: "txt_pageuser", desc: "txt_pageuser_desc" },
    ],
    [
        KeyCommandType.SidebarPageUp,
        { label: "txt_sidebar_pgup", desc: "txt_sidebar_pgup_desc" },
    ],
    [
        KeyCommandType.SidebarUp,
        { label: "txt_sidebar_up", desc: "txt_sidebar_up_desc" },
    ],
    [
        KeyCommandType.SidebarPageDown,
        { label: "txt_sidebar_pgdn", desc: "txt_sidebar_pgdn_desc" },
    ],
    [
        KeyCommandType.SidebarDown,
        { label: "txt_sidebar_down", desc: "txt_sidebar_down_desc" },
    ],
    [
        KeyCommandType.ToggleFps,
        { label: "cmnd:togglefps", desc: "cmnd:togglefpsdesc" },
    ],
]);
