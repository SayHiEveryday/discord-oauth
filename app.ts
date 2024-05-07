import express from "express";
import axios from "axios";
import pool from "./utils/database";
import { v4 } from "uuid";
import cookieParser from "cookie-parser"
import { clientID , clientSe } from "./constant.json"

const app = express();

const clientid = clientID
const clientse = clientSe

app.set('view engine','ejs');

app.set('views', './template');
app.use('/static', express.static('static'));
app.use(cookieParser())

app.get('/', async (req,res) => {
    const title  = 'EIEI';
    res.render('test',{ title });
});

app.get('/api/callback', async (req,res) => {
    if (!req.query.code) {
        res
            .setHeader('Content-Type','text/plain')
            .status(500)
            .send("No code ERR")
    }
    let recode = req.query.code;
    const data = {
        grant_type: 'authorization_code',
        code: `${recode}`,
        redirect_uri: "http://localhost:8000/api/callback",
    };
    
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    try {
        const response = await axios.post(`https://discord.com/api/v10/oauth2/token`, data, { headers, auth: { username: clientid, password: clientse }});
        let genuuid = v4()
        let actoken = response.data.access_token
        let retoken = response.data.refresh_token
        await pool.query("INSERT INTO `oauth-discord` (uuid,retoken,token) VALUES (?,?,?)", [genuuid,retoken,actoken], async (err) => {
            if (err) {
                res
                    .status(500)
                    .send(err)
                return
            }
            res
                .cookie("uuid",genuuid,{
                    expires: new Date(Date.now() + response.data.expires_in)
                })
                .cookie("scope",response.data.scope, {
                    expires: new Date(Date.now() + response.data.expires_in)
                })
                .redirect("/render");

        });
    } catch (e) {
        res
            .status(500)
            .send(e)
    }
});

app.get("/render", async (req,res) => {
    const getuuid = req.cookies.uuid;
    const scope = req.cookies.scope;
    if (!getuuid) {
        res
            .redirect("/")
        return
    }
    if (!scope) {
        res
            .redirect("/")
        return
    }
    await pool.query("SELECT * FROM `oauth-discord` WHERE uuid = ?", [getuuid], async (err,result) => {
        if (err) {
            res
                .status(500)
                .send(err)
            return
        }
        const response = await axios.get(`https://discord.com/api/v10/users/@me`,{
            headers: {
                Authorization: `Bearer ${result[0].token}`
            }
        });
        const data = response.data;
        const avatar = "https://cdn.discordapp.com/avatars/" + data.id + "/" + data.avatar + ".png";
        const guildcheck = await axios.get(`https://discord.com/api/v10/users/@me/guilds`,{
            headers: {
                Authorization: `Bearer ${result[0].token}`
            }
        });
        const name = "User: " + data.username
        const amount = "Is in " + guildcheck.data.length + " guild";

        res.render('index',{avatar,name,amount})
    });

});

app.listen(8000, () => {
    console.log('localhost:8000')
});