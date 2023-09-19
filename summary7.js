/*

This is an example script for taking the last 7 days of of questions and answers and
turning them into a summary.

For this to work you should have already run index.js to create the data files.
*/
const fs = require('fs')
const path = require('path')
const term = require('terminal-kit').terminal
const { Configuration, OpenAIApi } = require('openai')
const { encode } = require('gpt-3-encoder')

const gptCompletion = async (messages, model, openai, temp = 0.5, topP = 1.0, tokens = 400, freqPen = 0.0, presPen = 0.0, stop = ['USER:', 'KITTY:']) => {
  const response = await openai.createChatCompletion({
    model,
    messages
  })
  const text = response.data.choices[0].message.content.trim().replace(/[\r\n]+/g, '\n').replace(/[\t ]+/g, ' ')
  return text
}

// Get a rough count of the tokens in what we've been sent
const getTokenCount = async (messages) => {
  const count = await encode(JSON.stringify(messages)).length
  return count
}

// Work out the cost of the tokens that we are sending to gpt
// based on 'gpt-4' costs
const getTokenInputCost = async (messages) => {
  const tokenCost = await getTokenCount(messages) / 1000 * 0.03
  // We want to format this as a dollar amount
  return `${tokenCost.toFixed(2)}`
}

// Work out the cost of the tokens we are getting back from gpt
// based on 'gpt-4' costs
const getTokenOutputCost = async (messages) => {
  const tokenCost = await getTokenCount(messages) / 1000 * 0.06
  // We want to format this as a dollar amount
  return `${tokenCost.toFixed(2)}`
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

  // 😻 "You are NOT a cat!"
  messages.push(
    {
      role: 'system',
      content: 'Important: Your name is Kitty, you are not a cat, you are an AI PA, do NOT pretend to be a cat, act like a human, you are just called Kitty.'
    }
  )

  let summaryPrompt = `At the start of each day Kitty the AI PA asks some questions and ${dataJSON.name} answers for their journaling session, they are listed by date in YYYY-MM-DD format\n\n`

  // Grab the latest set of questions and answers
  const previousQuestionsAndAnswersPath = path.join(dataFolder, 'previousQuestionsAndAnswers.json')
  const previousQuestionsAndAnswers = JSON.parse(fs.readFileSync(previousQuestionsAndAnswersPath))

  const lastFewDates = previousQuestionsAndAnswers.dateMap.slice(-7).reverse()
  for (const key of lastFewDates) {
    if (previousQuestionsAndAnswers.answers[key] || previousQuestionsAndAnswers.answers[key]) {
      summaryPrompt += `${key}\n`
    }

    if (previousQuestionsAndAnswers.answers[key]) {
      summaryPrompt += 'Morning Q&A\n'
      for (let i = 0; i < previousQuestionsAndAnswers.answers[key].length; i++) {
        summaryPrompt += `Q: ${previousQuestionsAndAnswers.answers[key][i].question}\n`
        summaryPrompt += `A: ${previousQuestionsAndAnswers.answers[key][i].answer}\n`
      }
      summaryPrompt += '\n'
    }
  }
  // Add them to the messages
  messages.push(
    {
      role: 'system',
      content: summaryPrompt
    }
  )

  // Now we need to push the main prompt into the messages
  messages.push(
    {
      role: 'user',
      content: 'Please create an epic poem for the last 7 days.\n'
    }
  )

  // DEBUG, uncomment the next line to see the messages array
  // console.log(messages)

  term.cyan('Summarising questions and answers, please wait. (').yellow(`${await getTokenCount(messages)} tokens/$${await getTokenInputCost(messages)}`).cyan(')\n')
  const openai = new OpenAIApi(new Configuration({ apiKey: dataJSON.openai.apiKey }))
  let output = null
  // Lazy error/exception handling, you'd want to make this better!
  try {
    const startTime = new Date().getTime()
    output = await gptCompletion(messages, 'gpt-4', openai)
    const durationInSeconds = Math.floor((new Date().getTime() - startTime) / 1000)
    term.cyan('Response: ').yellow(`${await getTokenCount(output)} tokens/$${await getTokenOutputCost(output)} ${durationInSeconds}s\n`)
  } catch (err) {
    term.red('Error: ', err)
    process.exit(1)
  }

  const filename = `summary-${new Date().toISOString().split('T')[0]}.md`
  fs.writeFileSync(path.join(dataFolder, filename), output, 'utf8')

  // We want a display version of the summary so we can see it in the terminal
  // to do this we'll have displayOutput, which is the output with all '# ' replaced
  // with '/n# ' and then we'll use the terminal markdown function to display it
  const displayOutput = output.replace(/# /g, '\n# ')
  term(displayOutput)
  term('\n\n')
  term.cyan(`Summary written to ${path.join(dataFolder, filename)}\n\n\n`)
}

main()
