require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] });
const request = require("request");
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const rateLimit = require("express-rate-limit");
const baseurl = 'https://emas3.ui.ac.id';
const username = process.env.MOODLEUSER;
const password = process.env.MOODLEPASS;

const login = (baseurl, username, password) => new Promise((resolve, reject) => {
    request(`${baseurl}/login/token.php?username=${username}&password=${password}&service=moodle_mobile_app`, function (error, response, body) {
        if (error) return reject(error);
        try {
            console.log(JSON.parse(body))
            resolve(JSON.parse(body))
        } catch (e) {
            reject(e)
        }
    })
})

const core_calendar_get_calendar_upcoming_view = (baseurl, token) => new Promise((resolve, reject) => {
    request(`${baseurl}/webservice/rest/server.php?moodlewsrestformat=json&wsfunction=core_calendar_get_calendar_upcoming_view&moodlewssettingfilter=true&moodlewssettingfileurl=true&wstoken=${token}`, function (error, response, body) {
        // console.log(JSON.parse(body))
        resolve(JSON.parse(body))
    })
})

function dateformat(int) {
    var date = new Date(int)
    date.setTime(date.getTime() + 7 * 60 * 60 * 1000);
    // Indonesia WIB timezone is UTC+7
    var day = date.getDate().toString(),
        dayF = (day.length == 1) ? '0' + day : day,
        month = (date.getMonth() + 1).toString(), // +1 because getMonth starts at zero for January
        monthF = (month.length == 1) ? '0' + month : month,
        hour = (date.getHours()).toString(),
        hourF = (hour.length == 1) ? '0' + hour : hour,
        minute = (date.getMinutes()).toString(),
        minuteF = (minute.length == 1) ? '0' + minute : minute

    return { dayF, monthF, hourF, minuteF }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Register slash commands
    client.application.commands.create({
        name: 'activities',
        description: 'Get upcoming Moodle activities'
    }).catch(console.error);
    
    client.user.setActivity('/activities', { type: 'LISTENING' });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === 'activities') {
        await interaction.deferReply();
        try {
            const { token, privatetoken } = await login(baseurl, username, password)
            const events = await core_calendar_get_calendar_upcoming_view(baseurl, token)
            var message = '';
            for (let index = 0; index < events.events.length; index++) {
                var date = dateformat(events.events[index].timesort * 1000)
                message = `${message} [${date.dayF}/${date.monthF} at ${date.hourF}:${date.minuteF}] ${events.events[index].name} from ${events.events[index].course.fullname}\n\n`;
            }
            await interaction.editReply(message || 'No activities found!')
        } catch (error) {
            console.error('Error fetching activities:', error)
            await interaction.editReply('Error fetching activities!')
        }
    }
});

client.login(process.env.DISCORDTOKEN);

const http = require("http");
var express = require('express');
var app = express();
const server = http.createServer(app);

app.get('/', function (req, res) {
    res.send('The bot is running now ;)');
});

// Add headers
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next()
});

app.use(
    rateLimit({
        windowMs: 1 * 60 * 60 * 1000, // 1 hour duration in milliseconds
        max: 50,
        message: "You exceeded 50 requests in 1 hour limit!",
        headers: true,
    })
);

app.get('/api', async function (req, res) {
    const { token, privatetoken } = await login(baseurl, username, password)
    const events = await core_calendar_get_calendar_upcoming_view(baseurl, token)
    res.send(events);
});

server.listen(process.env.PORT)