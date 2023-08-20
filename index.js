/*

Hey there,

This is a very quickly thrown together script to showing using gpt-4 generating journaling questions.

This has been written as a script that runs from top to bottom each time rather than a
more properly structured program. This is just to show how it works in concept, if you
wanted to expand on this you'd want to make it more modular.

Good luck!

*/

const fs = require('fs')
const path = require('path')
const term = require('terminal-kit').terminal
const { Configuration, OpenAIApi } = require('openai')

const gpt3Completion = async (messages, model, openai, temp = 0.5, topP = 1.0, tokens = 400, freqPen = 0.0, presPen = 0.0, stop = ['USER:', 'KITTY:']) => {
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
  let dataJSON = {}
  const dataJSONPath = path.join(dataFolder, 'data.json')
  if (fs.existsSync(dataJSONPath)) {
    dataJSON = JSON.parse(fs.readFileSync(dataJSONPath))
  }

  // If there is no openai node, or the openai node doesn't have an API key then we need to ask
  // the user for one
  if (!dataJSON.openai || !dataJSON.openai.apiKey) {
    term('\nPlease enter your openai API key, you must be able to use the \'gpt-4\' model.')
    term('\nYou can get your API key from https://beta.openai.com/account/api-keys\n')
    term('\nAPI Key: ')
    const apiKey = await term.inputField({}).promise
    dataJSON.openai = { apiKey }
    fs.writeFileSync(dataJSONPath, JSON.stringify(dataJSON, null, 2))
  }
  const openai = new OpenAIApi(new Configuration({ apiKey: dataJSON.openai.apiKey }))

  // If we don't know the user's name then we need to ask for it
  if (!dataJSON.name) {
    term('\nPlease enter your name: ')
    const name = await term.inputField({}).promise
    dataJSON.name = name
    fs.writeFileSync(dataJSONPath, JSON.stringify(dataJSON, null, 2))
  }
  // If we don't have a metaPrompt then we add the default one
  if (!dataJSON.metaPrompt) {
    dataJSON.metaPrompt = `You are a chatbot named KITTY. Your job is to help ${dataJSON.name} do daily journaling. You're going to be keeping track of the questions asked and the answers given. You are generally helpful and friendly.`
    fs.writeFileSync(dataJSONPath, JSON.stringify(dataJSON, null, 2))
    term('\n\nWe\'ve added a default meta prompt for you, you can change this in the data.json file.\n\n')
  }
  // If we don't have a bunch of default morning questions then we add them
  if (!dataJSON.morningQuestions) {
    // read in the defaultQuestions.txt file
    const defaultQuestions = fs.readFileSync(path.join(dataFolder, 'defaultQuestions.txt'), 'utf8')
    // split it into an array of questions
    const defaultQuestionsArray = defaultQuestions.split('\n')
    // add the questions to the dataJSON
    dataJSON.morningQuestions = defaultQuestionsArray
    fs.writeFileSync(dataJSONPath, JSON.stringify(dataJSON, null, 2))
  }

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

  // Now we're going to grab the last five entires from the previousQuestionsAndAnswers object
  // This next line grabs the last five and then reverses them so we'll have the most recent one first
  // Go grab the previous questions and answers
  let previousQuestionsAndAnswers = {}
  const previousQuestionsAndAnswersPath = path.join(dataFolder, 'previousQuestionsAndAnswers.json')
  if (fs.existsSync(previousQuestionsAndAnswersPath)) previousQuestionsAndAnswers = JSON.parse(fs.readFileSync(previousQuestionsAndAnswersPath))
  let lastFiveDates = []
  if (previousQuestionsAndAnswers.dateMap) lastFiveDates = previousQuestionsAndAnswers.dateMap.slice(-5).reverse()
  const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let daysAgoCounter = 1
  // Now loop through those dates so we can grab the questions and answers from the answers node
  for (const date of lastFiveDates) {
    // The date is in the format of YYYY-MM-DD, we need to convert that into a day of the week
    const dayOfTheWeek = daysOfTheWeek[new Date(date).getDay()]
    // See if we have an entry for this date
    if (previousQuestionsAndAnswers.answers[date]) {
      // Loop through those question answer objects
      let previousQuestion = ''
      if (daysAgoCounter === 1) {
        previousQuestion += `Yesterday, ${dayOfTheWeek} (${date}), ${dataJSON.name} was asked the following questions: `
      } else {
        if (daysAgoCounter === 2) {
          previousQuestion += `${dayOfTheWeek} just gone (${date}), ${dataJSON.name} was asked the following questions: `
        } else {
          previousQuestion += `Last ${dayOfTheWeek} (${date}), ${dataJSON.name} was asked the following questions: `
        }
      }
      for (const questionAnswer of previousQuestionsAndAnswers.answers[date]) {
        previousQuestion += `${questionAnswer.question} - `
      }
      previousQuestion += 'and gave the following answers: '
      for (const questionAnswer of previousQuestionsAndAnswers.answers[date]) {
        previousQuestion += `${questionAnswer.answer} - `
      }
      messages.push(
        {
          role: 'system',
          content: previousQuestion
        }
      )
    }
    daysAgoCounter++
  }

  // Now we've set all of that up, the meta prompt, the day of the week, the previous questions and answers
  // we are ready to ask the main request to the GPT-4 API to generate some questions
  // Now we ask the ultimate question
  messages.push(
    {
      role: 'user',
      content: 'Please create a set of three questions to ask in the MORNING by combining relevant questions from the initial list and formulating new ones. When appropriate, incorporate overarching themes from previous responses into the questions, but, very important, don\'t be overly direct with follow-up inquiries and don\'t always reference them, you can go back to the original list of questions for guidance, please mix it up, one question should always be new and unreliated to previous answers. Remember the information about weekends! Put more weight on recent questions and answers rather than older ones, questions and answers from a few days ago are less relevant than the past couple of days (unless the last couple of days we the weekend). Put more focus on the answers given than the questions you previously asked (they are just there for context). Remember you are asking these at the start of the day. There must be three questions, no more or less. Please return those three questions in .txt format with one question per line. Important: there must be NO numbers at the start of each question! Only return the questions no other text.'
    }
  )

  // DEBUG, uncomment the next line to see the messages array
  // console.log(messages)

  // Here we are going to try and grab three questions from the GPT-4 API
  const questions = []
  let escapeCounter = 0
  while (questions.length !== 3 && escapeCounter < 10) {
    // empty the questions array
    questions.length = 0
    if (escapeCounter === 0) {
      term.cyan('Thinking of some questions to ask you.\n')
    } else {
      term.cyan('Getting some different questions\n')
    }
    const output = await gpt3Completion(messages, 'gpt-4', openai)
    // Split the output into an array of lines
    const lines = output.split('\n')
    // Loop through the lines
    for (let line of lines) {
      // Add the line to the questions array
      // Sometimes the question will have a number at the start, it could be '#1' or '1.' or '1)' or '1:'
      // we need to remove that number
      // We also need to remove any spaces at the start and end of the question
      line = line.replace(/^[0-9]+[.) :]/, '').trim()
      questions.push(line)
    }
    // Increment the escape counter
    escapeCounter++
  }

  // DEBUG, uncomment the next line to see the questions array
  // console.log(questions)

  // Add an extra general question to the questions array
  questions.push('Anything else you want to mention?')

  // Now we have the questions we need to ask them in turn awaiting the answer to each one
  // to fill up an answers array
  const answers = []
  let questionCounter = 1
  for (const question of questions) {
    // Ask the question
    term('\n')
    term.cyan(`${questionCounter}: ${question}\n> `)
    // Get the answer
    const answer = await term.inputField({}).promise
    term('\n')
    // Add the answer to the answers array
    answers.push(answer)
    questionCounter++
  }

  // Now we need to save the answers to the endofdayAnswers.json file
  // First we need to get the date in YYYY-MM-DD format
  const date = d.toISOString().slice(0, 10)
  // Now we need to see if we have an entry for this date in the previousQuestionsAndAnswers.json file,
  // if not add it to the dateMap array and create an empty answers array
  if (!previousQuestionsAndAnswers.answers) previousQuestionsAndAnswers.answers = {}
  if (!previousQuestionsAndAnswers.dateMap) previousQuestionsAndAnswers.dateMap = []
  // If the date is not in the dateMap array then add it
  if (!previousQuestionsAndAnswers.dateMap.includes(date)) previousQuestionsAndAnswers.dateMap.push(date)
  // Clear the answers array (or create it if it doesn't exist)
  previousQuestionsAndAnswers.answers[date] = []

  // Now we need to add the questions and answers to the answers array, do this by looping through
  // the questions array and adding the question and answer to the answers array
  for (let i = 0; i < questions.length; i++) {
    // Only add it if the answer is not empty
    if (answers[i].trim() !== '') {
      previousQuestionsAndAnswers.answers[date].push(
        {
          question: questions[i],
          answer: answers[i]
        }
      )
    }
  }
  // Now we need to save the previousQuestionsAndAnswers object to the previousQuestionsAndAnswers.json file
  fs.writeFileSync(path.join(dataFolder, 'previousQuestionsAndAnswers.json'), JSON.stringify(previousQuestionsAndAnswers, null, 2))
  // Thank the user and wish them a good day
  term.cyan('\nThank you for your time, have a good day.\n')
  process.exit()
}

main()