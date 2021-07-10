import MongoClient from 'mongodb';

export class MongoConnect {
    url : string;
    dbname : string;
    connected : boolean;
    db : MongoClient.Db;

    constructor(url : string, dbname : string) {
        this.url = url;
        this.dbname = dbname;
    }

    connect(callback : Function){
        MongoClient.connect(this.url, (err, client) => {
            if(err){
                callback(true,"error");
                return;
            }
            console.log("mongodb connected.");

            this.db = client.db(this.dbname);
            this.connected = true;
            callback(false, "conncted");
        });
    }
    
    insertOne(collection : string, obj : any){
        return new Promise((resolve,reject) => {
            const c = this.db.collection(collection);
            c.insertOne(obj, (err,res) => {
                if(err){
                    reject(err);
                    return;
                }
                resolve(res);
            })
        })
    }

}