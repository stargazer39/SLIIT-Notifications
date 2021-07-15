import { Context, Telegraf } from 'telegraf';
import { Cursor, Db, MongoClient } from 'mongodb';
import { Update } from 'telegraf/typings/core/types/typegram';
import { sleep } from './common';

const MAX_LENGTH = 4000;

export class TelegramClient {
    token : string;
    bot : Telegraf;
    chatIDs : number[] = [];
    db : Db;

    constructor(token : string){
        this.token = token
        this.bot = new Telegraf(token);
    }

    setdb(db : Db){
        this.db = db;
    }

    setConfig(config : any) {
        this.chatIDs = config.chatIDs;
    }

    async launch() {
        // Add event listeners 
        this.bot.command('config', this._onConfig.bind(this));
        this.bot.launch();

        // Enable graceful stop
        // process.once('SIGINT', () => this.bot.stop('SIGINT'))
        // process.once('SIGTERM', () => this.bot.stop('SIGTERM'))
    }

    async _onConfig(ctx : Context<Update>) {
        console.log("onConfig");
        // Check if this chat id exsists
        try {
            const thisId = ctx.chat.id;
            if(this.chatIDs.includes(thisId)){
                ctx.reply("This group is already in the database.");
                return;
            }

            let config = await this.db.collection("config").findOne({ type:"config" });
            if(!config.chatIDs.includes(thisId)) {
                await this.db.collection("config").updateOne({ type:"config" }, { $push:{ chatIDs:thisId } });
                this.chatIDs.push(thisId);
                ctx.reply("This group have been added to notification list.");
            }else{
                ctx.reply("Chat in db but not in server");
            }
        }catch(e){
            ctx.reply("Configureation faild. Bot had a stroke.")
            console.dir(e);
        }        
    }

    async send(message : string){
        for(const c of this.chatIDs){
            try {
                let count = 0;
                while(count < message.length){
                    await this.bot.telegram.sendMessage(c,message.substring(count,count + MAX_LENGTH));
                    count += MAX_LENGTH;
                }
            }catch(e){
                console.log(`Sending to chatId ${c} faild with :`);
                console.dir(e);
            }
            await sleep(1000);
        }
    }
}