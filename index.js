require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] });
const request = require("request");
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const rateLimit = require("express-rate-limit");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-change-this';
const usersFile = path.join(__dirname, 'users.json');
const todosFile = path.join(__dirname, 'todos.json');

// Load todos from file
function loadTodos() {
    try {
        return JSON.parse(fs.readFileSync(todosFile, 'utf8'));
    } catch {
        return { global: [], personal: {} };
    }
}

// Save todos to file
function saveTodos(todos) {
    fs.writeFileSync(todosFile, JSON.stringify(todos, null, 2));
}

// Load users from file
function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch {
        return {};
    }
}

// Save users to file
function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Encrypt credentials
function encrypt(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

// Decrypt credentials
function decrypt(text) {
    const bytes = CryptoJS.AES.decrypt(text, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}
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
    
    const commands = [
        {
            name: 'register',
            description: 'Register your Moodle credentials',
            options: [
                {
                    name: 'username',
                    description: 'Your Moodle username',
                    type: 3,
                    required: true
                },
                {
                    name: 'password',
                    description: 'Your Moodle password',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: 'activities',
            description: 'Get upcoming Moodle activities'
        },
        {
            name: 'unregister',
            description: 'Remove your stored Moodle credentials'
        },
        {
            name: 'todo',
            description: 'Manage todo lists (global and personal)',
            options: [
                {
                    name: 'list',
                    description: 'List todos',
                    type: 1,
                    options: [
                        {
                            name: 'personal',
                            description: 'Show your personal todos (yes/no)',
                            type: 3,
                            required: false,
                            choices: [
                                { name: 'Yes', value: 'me' },
                                { name: 'No', value: 'global' }
                            ]
                        }
                    ]
                },
                {
                    name: 'add',
                    description: 'Add a todo entry',
                    type: 1,
                    options: [
                        {
                            name: 'entry',
                            description: 'The todo entry to add',
                            type: 3,
                            required: true
                        }
                    ]
                },
                {
                    name: 'done',
                    description: 'Mark a todo as done',
                    type: 1,
                    options: [
                        {
                            name: 'number',
                            description: 'The entry number',
                            type: 4,
                            required: true
                        }
                    ]
                },
                {
                    name: 'del',
                    description: 'Delete a todo entry',
                    type: 1,
                    options: [
                        {
                            name: 'number',
                            description: 'The entry number',
                            type: 4,
                            required: true
                        }
                    ]
                },
                {
                    name: 'addglobal',
                    description: 'Add a global todo entry',
                    type: 1,
                    options: [
                        {
                            name: 'entry',
                            description: 'The todo entry to add',
                            type: 3,
                            required: true
                        }
                    ]
                },
                {
                    name: 'doneglobal',
                    description: 'Mark a global todo as done',
                    type: 1,
                    options: [
                        {
                            name: 'number',
                            description: 'The entry number',
                            type: 4,
                            required: true
                        }
                    ]
                },
                {
                    name: 'delglobal',
                    description: 'Delete a global todo entry',
                    type: 1,
                    options: [
                        {
                            name: 'number',
                            description: 'The entry number',
                            type: 4,
                            required: true
                        }
                    ]
                }
            ]
        }
    ];
    
    // Register globally
    client.application.commands.set(commands).then(() => {
        console.log('✅ Global slash commands registered!');
    }).catch(err => {
        console.error('❌ Failed to register global commands:', err);
    });
    
    // Also register for each guild the bot is in (faster)
    client.guilds.cache.forEach(guild => {
        guild.commands.set(commands).catch(err => {
            console.error(`Failed to register guild commands for ${guild.name}:`, err);
        });
    });
    
    client.user.setActivity('/activities', { type: 'LISTENING' });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    console.log(`Command received: ${interaction.commandName} from ${interaction.user.tag}`);
    
    const userId = interaction.user.id;
    const users = loadUsers();
    
    if (interaction.commandName === 'register') {
        const moodleUsername = interaction.options.getString('username');
        const moodlePassword = interaction.options.getString('password');
        
        try {
            // Test credentials
            const testLogin = await login(baseurl, moodleUsername, moodlePassword);
            if (testLogin.error) {
                return interaction.reply({ content: '❌ Invalid credentials!', ephemeral: true });
            }
            
            // Store encrypted credentials
            users[userId] = {
                username: encrypt(moodleUsername),
                password: encrypt(moodlePassword)
            };
            saveUsers(users);
            
            interaction.reply({ content: '✅ Credentials saved! You can now use /activities', ephemeral: true });
        } catch (error) {
            console.error('Registration error:', error);
            interaction.reply({ content: '❌ Registration failed! Check your credentials.', ephemeral: true });
        }
    }
    
    if (interaction.commandName === 'unregister') {
        if (users[userId]) {
            delete users[userId];
            saveUsers(users);
            interaction.reply({ content: '✅ Credentials removed!', ephemeral: true });
        } else {
            interaction.reply({ content: '❌ No credentials found!', ephemeral: true });
        }
    }
    
    if (interaction.commandName === 'activities') {
        if (!users[userId]) {
            return interaction.reply({ content: '❌ Please register first with /register', ephemeral: true });
        }
        
        await interaction.deferReply();
        try {
            const moodleUsername = decrypt(users[userId].username);
            const moodlePassword = decrypt(users[userId].password);
            
            const { token, privatetoken } = await login(baseurl, moodleUsername, moodlePassword);
            
            if (token && token.error) {
                await interaction.editReply('❌ Login failed! Please re-register with /register');
                return;
            }
            
            const events = await core_calendar_get_calendar_upcoming_view(baseurl, token);
            var message = '';
            for (let index = 0; index < events.events.length; index++) {
                var date = dateformat(events.events[index].timesort * 1000)
                message = `${message} [${date.dayF}/${date.monthF} at ${date.hourF}:${date.minuteF}] ${events.events[index].name} from ${events.events[index].course.fullname}\n\n`;
            }
            await interaction.editReply(message || '📭 No activities found!')
        } catch (error) {
            console.error('Error fetching activities:', error)
            await interaction.editReply('❌ Error fetching activities!')
        }
    }

    if (interaction.commandName === 'todo') {
        const subcommand = interaction.options.getSubcommand();
        const todos = loadTodos();

        if (subcommand === 'list') {
            const personal = interaction.options.getString('personal') === 'me';
            let message = '';

            if (personal) {
                // Personal todos
                const userTodos = todos.personal[userId] || [];
                if (userTodos.length === 0) {
                    message = '📝 **Your Personal Todos:**\nNo todos yet!';
                } else {
                    message = '📝 **Your Personal Todos:**\n';
                    userTodos.forEach((todo, idx) => {
                        const status = todo.done ? '✅' : '❌';
                        message += `${idx + 1}. ${status} ${todo.text}\n`;
                    });
                }
            } else {
                // Global todos
                if (todos.global.length === 0) {
                    message = '🌍 **Global Todos:**\nNo global todos yet!';
                } else {
                    message = '🌍 **Global Todos:**\n';
                    todos.global.forEach((todo, idx) => {
                        const status = todo.done ? '✅' : '❌';
                        message += `${idx + 1}. ${status} ${todo.text}\n`;
                    });
                }
            }
            
            interaction.reply({ content: message, ephemeral: false });
        }

        if (subcommand === 'add') {
            const entry = interaction.options.getString('entry');
            
            if (!todos.personal[userId]) {
                todos.personal[userId] = [];
            }
            
            todos.personal[userId].push({ text: entry, done: false });
            saveTodos(todos);
            
            interaction.reply({ content: `✅ Added to your todos: "${entry}"`, ephemeral: true });
        }

        if (subcommand === 'done') {
            const number = interaction.options.getInteger('number') - 1;
            
            if (!todos.personal[userId] || number < 0 || number >= todos.personal[userId].length) {
                return interaction.reply({ content: '❌ Invalid todo number!', ephemeral: true });
            }
            
            todos.personal[userId][number].done = true;
            saveTodos(todos);
            
            interaction.reply({ content: `✅ Marked as done: "${todos.personal[userId][number].text}"`, ephemeral: true });
        }

        if (subcommand === 'del') {
            const number = interaction.options.getInteger('number') - 1;
            
            if (!todos.personal[userId] || number < 0 || number >= todos.personal[userId].length) {
                return interaction.reply({ content: '❌ Invalid todo number!', ephemeral: true });
            }
            
            const removed = todos.personal[userId].splice(number, 1);
            saveTodos(todos);
            
            interaction.reply({ content: `✅ Deleted: "${removed[0].text}"`, ephemeral: true });
        }

        if (subcommand === 'addglobal') {
            const entry = interaction.options.getString('entry');
            
            todos.global.push({ text: entry, done: false });
            saveTodos(todos);
            
            interaction.reply({ content: `✅ Added to global todos: "${entry}"`, ephemeral: false });
        }

        if (subcommand === 'doneglobal') {
            const number = interaction.options.getInteger('number') - 1;
            
            if (number < 0 || number >= todos.global.length) {
                return interaction.reply({ content: '❌ Invalid todo number!', ephemeral: true });
            }
            
            todos.global[number].done = true;
            saveTodos(todos);
            
            interaction.reply({ content: `✅ Marked as done: "${todos.global[number].text}"`, ephemeral: false });
        }

        if (subcommand === 'delglobal') {
            const number = interaction.options.getInteger('number') - 1;
            
            if (number < 0 || number >= todos.global.length) {
                return interaction.reply({ content: '❌ Invalid todo number!', ephemeral: true });
            }
            
            const removed = todos.global.splice(number, 1);
            saveTodos(todos);
            
            interaction.reply({ content: `✅ Deleted from global: "${removed[0].text}"`, ephemeral: false });
        }
    }


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