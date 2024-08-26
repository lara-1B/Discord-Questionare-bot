const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const fs = require('fs');

const questions = JSON.parse(fs.readFileSync('./questions.json', 'utf8'));

const botToken = 'BOT_TOKEN';



const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let participants = {}; 
let currentQuestionIndex = 0;
let quizInProgress = false;
let answersReceived = {};
let quizMessage;

function startQuiz(channel) {
    quizInProgress = true;
    currentQuestionIndex = 0;
    answersReceived = {};
    sendQuestion(channel);
}

function sendQuestion(channel) {
    if (currentQuestionIndex < questions.length) {
        const question = questions[currentQuestionIndex];
        const embed = new EmbedBuilder()
            .setTitle(`Question ${currentQuestionIndex + 1}`)
            .setDescription(question.question);

        const buttons = new ActionRowBuilder();
        question.options.forEach((option, index) => {
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`option_${index}`)
                    .setLabel(option)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        channel.send({ embeds: [embed], components: [buttons] });
    } else {

        endQuiz(channel);
    }
}

function endQuiz(channel) {
    quizInProgress = false;
    let results = '';
    for (const [userId, userData] of Object.entries(participants)) {
        results += `<@${userId}> scored ${userData.score} points.\n`; 
    }
    channel.send(`Quiz is over! Here are the results:\n${results}`);
}

function handleAnswer(interaction) {
    const userId = interaction.user.id;
    if (participants[userId] && quizInProgress) {
        const answerIndex = parseInt(interaction.customId.split('_')[1]);
        const correctAnswerIndex = parseInt(questions[currentQuestionIndex].correct);

        console.log(`${customId} Answer: ${answerIndex}, Correct Answer: ${correctAnswerIndex}`);

        if (answerIndex === correctAnswerIndex) {
            participants[userId].score += 1;
        }

        answersReceived[userId] = true;

        if (Object.keys(answersReceived).length === Object.keys(participants).length) {
            currentQuestionIndex++;
            answersReceived = {};
            sendQuestion(interaction.channel);
        }
        interaction.reply({ content: 'You Submitted your answer ', ephemeral: true });
    } else {
        interaction.reply({ content: 'you have not joined the quiz.', ephemeral: true });
    }
}




function initParticipants() {
    participants = {};
    quizInProgress = false;
}


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    initParticipants();
});

client.on('messageCreate', async (message) => {
    if (message.content === '!start') {
        initParticipants();
        message.channel.send('The quiz is starting soon! Click the button to join.');
        const joinButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('join_quiz')
                    .setLabel('JOIN')
                    .setStyle(ButtonStyle.Success)
            );
        quizMessage = await message.channel.send({ content: 'Click to join the quiz!', components: [joinButton] });

        let countdown = 10;
        const countdownMessage = await message.channel.send(`Countdown: ${countdown}`);


        const countdownInterval = setInterval(() => {
            countdown--;
            countdownMessage.edit(`Countdown: ${countdown}`);
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                quizMessage.edit({ components: [] });
                message.channel.send('Time to join is up! Registered participants:');
                let participantList = '';
                let index = 1;
                for (const userId in participants) {
                    participantList += `${index}. <@${userId}>\n`;
                    index++;
                }
                message.channel.send(participantList);
                startQuiz(message.channel);
            }
        }, 1000);
    }


    if (message.content.startsWith('!kick')) {
        const args = message.content.split(' ');
        if (args.length === 2 && !isNaN(args[1])) {
            const userNumber = parseInt(args[1]);
            const userId = Object.keys(participants)[userNumber - 1];
            if (userId) {
                delete participants[userId];
                message.channel.send(`<@${userId}> has been kicked from the quiz.`);
            } else {
                message.channel.send('Invalid user number.');
            }
        } else {
            message.channel.send('Usage: *kick <user_number>');
        }
    }
});


client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'join_quiz') {
        const userId = interaction.user.id;
        if (!participants[userId]) {
            participants[userId] = { score: 0 };
            interaction.reply({ content: 'You have joined the quiz!', ephemeral: true });
        } else {
            interaction.reply({ content: 'You are already registered for the quiz!', ephemeral: true });
        }
    } else if (interaction.customId.startsWith('option_')) {
        handleAnswer(interaction);
    }
});

client.login(botToken);
