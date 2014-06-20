// Wait till the browser is ready to render the game (avoids glitches)
const server_ip = "http://192.168.1.6";
const server_port = ":8080";

window.requestAnimationFrame(function () {
    new GameManager(4, KeyboardInputManager, HTMLActuator);
});
