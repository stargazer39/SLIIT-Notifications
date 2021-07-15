import express from "express";
import { SliitAPI, CourseModule } from "./sliit";
import  { MongoClient } from 'mongodb';
import readline from "readline";
import fs from "fs";
import { SyncTask } from './syncTasks';
import { sleep } from './common';
import { TelegramClient } from './telegram';

const port = process.env.PORT || 4200;
const app = express();

let sliit : SliitAPI;

// Username password test code
let file = fs.readFileSync("tmp/credentials.json");
let creds = JSON.parse(file.toString());
console.log(`Configured with creds : ${creds.username} , ${creds.password}`);

// Initialize Mongo client
const mongo = new MongoClient(creds.url,{ useUnifiedTopology: true });

// Initalize new Telegram client
const tclient = new TelegramClient(creds.botToken);

async function run() {
    try {
        await mongo.connect();

        // Current db
        const db = mongo.db("SLIITHistory");

        // Verify conncection
        await db.command({ ping:1 });
        console.log("Connected to Mongo server");

        // Get configurations from DB
        let config = await db.collection("config").findOne({ type:"config" });
        console.log(config);

        // Set DB instance and start Telegram client
        tclient.setdb(db);
        tclient.setConfig(config);
        await tclient.launch();

    }catch(e){
        // TODO - connect to telegram for error notifications
    }
}

run().catch(console.dir);


/* 
MongoClient.connect(creds.url, { useNewUrlParser: true }, (err, client) => {

    if(err) {
        throw err;
    }
    const db = client.db("SLIITHistory")
})

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
}) */