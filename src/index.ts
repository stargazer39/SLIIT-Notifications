import express from "express";
import { SliitAPI, CourseModule } from "./sliit";
import { MongoConnect } from "./mongo";
import readline from "readline";
import fs from "fs";
import { SyncTask } from './syncTasks';
import { sleep } from './common';
import { TelegramClient } from './telegram';

const port = process.env.PORT || 4200;
const app = express();

let sliit : SliitAPI;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

// Username password test code
let file = fs.readFileSync("tmp/credentials.json");
let creds = JSON.parse(file.toString());
console.log(`Configured with creds : ${creds.username} , ${creds.password}`);

// Initialize Mongo client
const mongo = new MongoConnect(creds.url,"SLIITHistory");

let task : SyncTask;

mongo.connect(async (err : boolean,msg : string) => {
    if(err){
        console.log("Mongo connection faild.");
        return;
    }
    console.log("Starting Task");
    const telegramClient = new TelegramClient(creds.botToken, mongo);
    //telegramClient.send("Hi");
    telegramClient.launch();
    task = new SyncTask(30, creds.username, creds.password, mongo, telegramClient);
    task.start();
    app.listen(port, () => {
        console.log(`Server is listening on ${port}`);
    });
})