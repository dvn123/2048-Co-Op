// Wait till the browser is ready to render the game (avoids glitches)
//const server_ip = "http://shrouded-lake-9799.herokuapp.com/";
//const server_port = "";
const server_ip = "http://192.168.1.6";
const server_port = ":8080";
const democracy_color = "#0068af";
const anarchy_color = "#F2555C";
const sync_interval = 5000;

const notice1 = "<div class=\"app-notice\"><span onclick=\"GM.closeNotice()\" class=\"notice-close-button\">x</span><p class=\"pop-message\">";
const notice2 = "</p></div>";

//TODO LOG, Only 1 vote per user, Test Vote Throttle, Chat, Round-Robin Mode, Fix CSS (Global container), Move server to europe.

var GM;

window.requestAnimationFrame(function () {
    GM = new GameManager(4, KeyboardInputManager, HTMLActuator);
});
