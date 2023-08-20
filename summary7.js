/*

This is an example script for taking the last 7 days of of questions and answers and
turning them into a summary.

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

  // 😻 "You are NOT a cat!"
  messages.push(
    {
      role: 'system',
      content: 'Important: Your name is Kitty, you are not a cat, you are an AI PA, do NOT pretend to be a cat, act like a human, you are just called Kitty.'
    }
  )

  let summaryPrompt = `At the start and end of each day Kitty the AI PA asks some questions and ${dataJSON.name} answers for their journaling session, they are listed by date in YYYY-MM-DD format\n\n`

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
      content: 'Please can give a "Summary Overview" and then give more focused summaries broken down into the following areas; "Professional Development", "Wellbeing and Self-care", "Personal Exploration and Enrichment", "Creative Endeavors" and "Routine and Time Management". Important, you must use the titles as provided in the double-quotes, keep the case of them the same. Do not put any pre-amble before the start of the summaries or after, just the results I\'ve asked for. Please return the summary in Markdown format, with a single # for the titles, and a single space between the # and the title. I need it in this format so my code can process it. You don\'t need to reference the date range in the output as I will put that in the filename. Thank you.\n'
    }
  )

  // DEBUG: Uncomment this to see the messages that will be sent to the API
  // console.log(messages)

  term.cyan('Summarising questions and answers, please wait.\n')
  const openai = new OpenAIApi(new Configuration({ apiKey: dataJSON.openai.apiKey }))
  let output = null
  // Lazy error/exception handling, you'd want to make this better!
  try {
    output = await gptCompletion(messages, 'gpt-4', openai)
  } catch (err) {
    term.red('Error: ', err)
    process.exit(1)
  }

  fs.writeFileSync(path.join(dataFolder, 'summary.md'), output, 'utf8')

  // We want a display version of the summary so we can see it in the terminal
  // to do this we'll have displayOutput, which is the output with all '# ' replaced
  // with '/n# ' and then we'll use the terminal markdown function to display it
  const displayOutput = output.replace(/# /g, '\n# ')
  term('\n\n')
  term(displayOutput)
  term('\n\n')
  term.cyan(`Summary written to ${path.join(dataFolder, 'summary.md')}\n\n\n`)
}

main()
