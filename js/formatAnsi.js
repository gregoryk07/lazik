function formatAnsi(unformatted){
    // Zamiana standardowych nowych linii na <br>
    let lines = unformatted.split("\n");
    
    spanFormat = function(color){ return "<span style=\"background-color: " + color + "; font-weight: bold; padding: 5px 0\">"; }
    
    let formattedLines = lines.map(line => {
        // Podstawowe podmianki kolorów, które chcesz zachować
        let processed = line
            .split("\x1b[0m").join("</span>") // RESET
            .split("\x1b[94m").join(spanFormat("blue")) // MAIN 
            .split("\x1b[37m").join(spanFormat("gray")) // TIME FORMAT
            .split("\x1b[33m").join(spanFormat("yellow")) // WARN
            .split("\x1b[31m").join(spanFormat("red")) // ERROR FATAL
            .split("\x1b[32m").join(spanFormat("green")) // USB
            .split("\x1b[92m").join(spanFormat("lime")) // USB DATA
            .split("\x1b[38;5;39m").join(spanFormat("cyan")) // USB SETUP
            .split("\x1b[38;5;208m").join(spanFormat("orange")) // DAEMON
            
        // Usunięcie wszystkich pozostałych, nierozpoznanych sekwencji ANSI (np. [38;5;208m)
        processed = processed.replace(/\x1b\[[0-9;]*m/g, "");

        processed = "<span class=\"line\">" + processed + "</span>";
        
        return processed;
    });

    return formattedLines.join("\n");
}