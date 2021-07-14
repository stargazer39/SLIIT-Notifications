import { Telegraf } from 'telegraf';
import { MongoConnect } from './mongo';

const MAX_LENGTH = 4000;

export class TelegramClient {
    token : string;
    bot : Telegraf;
    chatIDs : number[] = [];
    mongoClient : MongoConnect;

    constructor(token : string, mongoClient : MongoConnect){
        this.token = token
        this.mongoClient = mongoClient;
        this.bot = new Telegraf(token);
    }

    async launch() {
        let conf  = await this.mongoClient.findOne("config", { type:"config" }) as any;
        this.chatIDs = conf.chatIDs;

        console.log("Configiured telegram with ", conf);
        this.bot.command('config', async (ctx) => {
            let res  = await this.mongoClient.findOne("config", { type:"config", "chatIDs":{ $in:[ctx.chat.id] } });
            console.log(res);
            if(!res){
                await this.mongoClient.updateOne("config", { type:"config" }, { $push:{ "chatIDs":ctx.chat.id } })
                ctx.reply("This group have been added to notification list.");
                if(!this.chatIDs.includes(ctx.chat.id)) {
                    this.chatIDs.push(ctx.chat.id);
                }
            }else{
                ctx.reply("This group is already in the database.");
            }
            
        })
        this.bot.launch()

        // Enable graceful stop
        // process.once('SIGINT', () => this.bot.stop('SIGINT'))
        // process.once('SIGTERM', () => this.bot.stop('SIGTERM'))
    }
    send(message : string){
        for(const c of this.chatIDs){
            let count = 0;
            while(count < message.length){
                this.bot.telegram.sendMessage(c,message.substring(count,count + MAX_LENGTH));
                count += MAX_LENGTH;
            }
        }
    }
}