import express from "express";
import { SliitAPI } from "./sliit";
import readline from "readline";
import fs from "fs";

const port = process.env.PORT || 4200;
const app = express();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

// Username password test code
let file = fs.readFileSync("tmp/credentials.json");
let creds = JSON.parse(file.toString());
console.log(`Configured with creds : ${creds.username} , ${creds.password}`);

app.get("/", async (req,res) => {
    let sliit = new SliitAPI();
    try {
        await sliit.login(creds.username, creds.password);
        let modules = await sliit.getEnrolledModules();
        res.end(JSON.stringify(modules));
    }catch(e){
        res.end(e);
    }
});

app.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});