import axios from "axios";
import axiosCookieJarSupport from "axios-cookiejar-support";
import tough from "tough-cookie";
import querystring from "querystring";
import cheerio from "cheerio";

axiosCookieJarSupport(axios);


export class SliitAPI {
    cookieJar : tough.CookieJar;

    constructor(){
        this.cookieJar = new tough.CookieJar();
    }

    login(username : string, password : string){
        return new Promise((resolve ,reject) => {
            // Get the default cookie to the cookie jar
            axios.get("https://courseweb.sliit.lk/", {
                jar: this.cookieJar,
                withCredentials: true,
            })
            .then(() => {
                // Send username and password with POST
                axios.post("https://courseweb.sliit.lk/login/index.php?authldap_skipntlmsso=1",
                 querystring.stringify({
                    username:username,
                    password:password
                 }),{
                    headers:{
                        "Content-Type":"application/x-www-form-urlencoded",
                    },
                    jar:this.cookieJar,
                    withCredentials: true
                }).then((data) => {
                    // Resolve response data
                    resolve(data.data);
                }).catch(() => {
                    console.log("Login failed.");
                })
            })
            .catch(() => {
                console.log("Connection faild.");
            });
        });
    }
}