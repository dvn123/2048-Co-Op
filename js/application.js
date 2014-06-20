// Wait till the browser is ready to render the game (avoids glitches)
const server_ip = "http://192.168.1.6";
const server_port = ":8080";
const democracy_color = "#0068af";
const anarchy_color = "#F2555C";

window.requestAnimationFrame(function () {
    new GameManager(4, KeyboardInputManager, HTMLActuator);
});
