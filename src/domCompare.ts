// Import dom-compare. I really dont like this. Someone make types pleasss
const htmlCompare = require("html-compare");

export function compareHTML(oldHTML : string, newHTML : string) : Promise<boolean> {
    return htmlCompare.compare(oldHTML, newHTML);
}