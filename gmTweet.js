/*

This is an example script for taking the latest set of questions and answers and
turning them into a list of suggested tweets.

For this to work you should have already run index.js to create the data files.
*/
const fs = require('fs')
const path = require('path')
const term = require('terminal-kit').terminal
const { Configuration, OpenAIApi } = require('openai')

const gptCompletion = async (messages, model, openai, temp = 0.5, topP = 1.0, tokens = 400, freqPen = 0.0, presPen = 0.0, stop = ['USER:', 'KITTY:']) => {
  const response = await openai.createChatCompletion({
    model,
    messages
  })
  const text = response.data.choices[0].message.content.trim().replace(/[\r\n]+/g, '\n').replace(/[\t ]+/g, ' ')
  return text
}

const main = async () => {
  // Check for a data folder and if it doesn't exist create it
  const dataFolder = path.join(__dirname, 'data')

  // Check for a dataJSON file, if one exists the read it in
  const dataJSONPath = path.join(dataFolder, 'data.json')
  const dataJSON = JSON.parse(fs.readFileSync(dataJSONPath))

  // Now we have everything we need to build up the messages we want to send to the GPT-4 API
  const messages = []

  // Add the meta prompt
  messages.push(
    {
      role: 'system',
      content: dataJSON.metaPrompt
    }
  )

  // Give it some information about the day of the week, plus defining the weekend and work week, change this to taste
  const d = new Date()
  const fullNameDayOfWeek = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(d)
  messages.push(
    {
      role: 'system',
      content: `VERY IMPORTANT: Today is ${fullNameDayOfWeek} and the date is ${d.toLocaleDateString('en-GB')}, the time is ${d.toLocaleTimeString('en-GB')}. Important: Saturday and Sunday are the weekend for relaxing not working, if the day is Saturday or Sunday make your questions less work related and more time-off chilling related. ${dataJSON.name} counts the start of the week and work week as Monday, anything 'new week' related starts on Monday. The end of 'work week' related ends on Friday. IMPORTANT, please don't be asking about the weekend on any other day than Monday or Friday, please pay attention to the current day of the week.`
    }
  )

  // 😻 "You are NOT a cat!"
  messages.push(
    {
      role: 'system',
      content: 'Important: Your name is Kitty, you are not a cat, you are an AI PA, do NOT pretend to be a cat, act like a human, you are just called Kitty.'
    }
  )

  // Build up the structure of the tweet
  const robotFace = '🤖 GM! '

  const mainMessageBody = ''
  const messageTail = '\n\n/via Kitty'
  const remainingCharacters = 260 - robotFace.length - mainMessageBody.length - messageTail.length
  messages.push(
    {
      role: 'user',
      content: `${dataJSON.name} has just logged on and answered some questions about how they arefeeling by answering some journaling questions. In a moment you'll be given the questions and answers that were presented. The answers will be quite long but they want a tweet that roughly conveys the content and maybe the feelings in the answers, feel free to smoosh the answers together. Important, you do not need to use ALL the answers, do NOT use all of them! You can add some flavour text to the beginning of the tweet, along the lines of "${dataJSON.name} has just logged on", or "${dataJSON.name} has started the day", imagine you are there with them, so it could be "I've just seen ${dataJSON.name}" or "${dataJSON.name} has just told me" etc, something related to settling down and getting ready to begin, but do it using your own way. You can also tag on an opinion at the end if you like. Please try as hard as possible to get the whole thing, including flavour text as close to ${remainingCharacters} characters (the longer the tweet the better). VERY important: the tweet MUST NOT BE longer than ${remainingCharacters} characters, ever!`
    }
  )

  // Grab the latest set of questions and answers
  const previousQuestionsAndAnswersPath = path.join(dataFolder, 'previousQuestionsAndAnswers.json')
  const previousQuestionsAndAnswers = JSON.parse(fs.readFileSync(previousQuestionsAndAnswersPath))
  // Grab the latest set of questions and answers
  const mostRecentDate = previousQuestionsAndAnswers.dateMap.pop()
  const latestQuestionsAndAnswers = previousQuestionsAndAnswers.answers[mostRecentDate]
  let todaysQuestionsAndAnswers = 'Today\'s questions and answers:\n\n'
  for (const questionAndAnswer of latestQuestionsAndAnswers) {
    todaysQuestionsAndAnswers += `\nQuestion: ${questionAndAnswer.question}\nAnswer: ${questionAndAnswer.answer}\n\n`
  }
  messages.push(
    {
      role: 'system',
      content: todaysQuestionsAndAnswers
    }
  )

  // Now tell it to generate the tweets, hopefully in a format we can use!
  messages.push(
    {
      role: 'user',
      content: 'Please give six alternative tweets an array suitable for javascript. Each tweet is a single element in the array, the array will be six elements long, no more, no less. Not variable names just an array starting with [ and ending with ], nothing before or after it as I need to parse the results with code thanks! Do not put anything before or after the array, I need JUST the array.'
    }
  )

  term.cyan('\nGrabbing some gm tweets\n')
  const openai = new OpenAIApi(new Configuration({ apiKey: dataJSON.openai.apiKey }))
  let output = await gptCompletion(messages, 'gpt-4', openai)
  // Check to make sure the response starts with a '[' and ends with a ']' after trimming off any spaces
  // remove everything before the first '[' and everything after the last ']'
  // eslint-disable-next-line no-useless-escape
  output = output.trim().replace(/^[^\[]+/, '').replace(/[^\]]+$/, '')
  const correctLengthTweets = []
  if (output.trim().startsWith('[') && output.trim().endsWith(']')) {
    // Turn the string into an array we can use in code
    try {
      const tweets = JSON.parse(output)
      // Now we need to check that each tweet is less than 280 characters
      for (const tweet of tweets) {
        const newTweet = robotFace + tweet + messageTail
        if (newTweet.length <= 280) {
          correctLengthTweets.push(newTweet)
        } else {
          term.cyan(`Tweet was too long, ${newTweet.length} characters, skipping\n`)
        }
      }
    } catch (error) {
      term.red('\n\nThere was an error parsing the output from chatgpt, please try again.\n\n')
      return
    }
  } else {
    term.red('\n\nThere was an error parsing the output from chatgpt, please try again.\n\n')
    console.log(output)
    return
  }

  // Loop through the tweets and send them to terminal
  term.cyan('\n-------------------------\n')
  for (const tweet of correctLengthTweets) {
    term.white(`\n${tweet}\n`)
    term.yellow(`(${tweet.length} characters)\n`)
    term.cyan('\n-------------------------\n')
  }

  // TODO: Add the bit to ask the user which one they want to tweet and then tweet it
}

main()
