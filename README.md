# basic-kitty-journaling

A cut down example version of Kitty an AI system to aid journaling and reflection. It's been written as a script to be read/run from top to bottom. You'd definitely want to convert it to a more modular system if you wanted to integrate it or expand on it.

## Installation

You will need an openai API key, from here: https://platform.openai.com/account/api-keys and access to the `gpt-4` model, check if you have access from the Model dropdown in the Playground: https://platform.openai.com/playground

You can use `gpt-3.5` to see how things work, but it's worse at understanding the concept of days and time. You'll need to change references from `gpt-4` to `gpt-3.5` in the code (in your own fork 😉) for that to happen.


This is written in Nodejs (old 'require' format for _reasons_, feel free to update that!)

Clone or download the code from this repo into whichever directory you want.

Then run  `npm install` to get it setup.

`npm start` will run the main script, you should run this before any other scripts as it'll ask you set-up questions on the first run (api key, name and so on)

# THIS IS NOT A "PRODUCTION READY" SYSTEM

I've put this here as an example of how I'm _kinda_ using gpt-4 for journaling and how you _could_ use it. The main purpose is so you can read the code to see how I'm building up the prompt to send to the gpt-4 API. My version of Kitty is too engrained with my other tools, this is a stripped down version to show the concepts.

Hopefully you'll be able to follow along with the code to see what's going on and use the ideas to make your own version.

There is nothing too complicated going on here, no vector databases, no embedding, this is purely about creates prompts to feed to the API, enhanced by rolling previous inputs back into them.

There are a few places where you'll see `// DEBUG, uncomment the next line to see the messages array` if you do indeed do that you'll see the message prompt array logged to the console which can be useful.

# Journaling

The script is designed to generate three questions (and one hardcoded question) to ask you, it also assumes you're running it near the start of the day. Even though "AI" is smoke and mirrors I've found this particularly useful as I get bored by the same journaling questions every day and this gives you new questions each day often reflecting the previous days.

It will then store those questions and answers in a file called `previousQuestionsAndAnswers.json` in the `data` folder. This file is in the `.getignore`.

**Note**: Your answers will get sent to the openai API, so you may want to be mindful of what you use this for. I use it for general running of my art studio so I don't really mind that it _may_ know I'm planning on doing Pen Plotting today.

The questions it asks you are based on three things.

1. The `metaPrompt` in the `data.json` file. After running the script for the first time you may want to edit that prompt to meet your needs a little better. For example I've set mine as though Kitty is assisting an artist in an art studio. ("`You are a chatbot named KITTY. You are a project manager and personal assistant for an art studio. The owner of the studio is an artist who needs help with scheduling, time management and project management.`") although this is more useful for the larger Kitty system I'm using, but hopefully that gives you some ideas. This "meta prompt" will "shape" the questions.
2. Kitty will use the list of 20 default questions as a base for making new questions. Once again you can edit these in the `data.json` file once the script has been run once. I used the web based version of ChatGPT to come up with questions and then picked the ones I liked the best. The default ones are fairly general. For my main system I asked ChatGPT to create new ones that were more focused on art and creativity.
3. Kitty will also use the previous five sets of questions and answer to generate new questions. This gives you a "rolling context window" of what's going on. Kitty can get quite hung-up on some of your answers and keep asking you about them. You can attempt to change the subject ("I'm not doing that anymore, I'm doing x, y & z instead") or say something like "Please stop asking me about x" when you're asked the fourth "`Anything else you want to mention?`" question. Kitty _may_ pay attention.

Kitty is not very good at understanding the concept of Weekends, sorry!

By changing the `metaPrompt` and 20 default questions you can really help focus Kitty on what you want to be journaling about.

### End of day

In my version of Kitty it asks morning and then "end of day" questions. It wouldn't be hard to modify this code to also do that, but it seemed overkill to include now and would just make things look too complicated.

Having end of the day questions is good though.

# Good Morning Tweet

As the first example of what you _could_ go on to do I've included `gmTweet.js`, run with `node gmTweet`

This will take the most recent set of questions and answers and attempt to generate 6 different potential 'GM' tweets.

This is very similar to how I have my own version of Kitty running, but I've thrown some extra personalities on my Kitty that get randomly selected, like 'Cheerful' or 'Sassy' - because it makes me laugh. You can see examples of _my_ Kitty in action here: https://twitter.com/revdancatt

Also this will not actually tweet the results, that an exercise left to the reader.

# Summary7

The second example of what you _could_ do is in `summary7.js`, run nwith `node summery7`.

This bundles up the previous seven sets of questions and answers and asks gpt to create a summary based on some hard-coded areas (adjust to taste).

In an ideal world this is something that would happen on a weekly basis, and later roll those into a monthly summary. In this implementation old results (`summary.md`) will be overwritten with the latest output, so if you want to keep them you'll want to move/rename those files somewhere.

### Potential Problems with summaries

If you tend to give long answers when they're all bundled up with the prompts you may blow your token limit. An estimate for the number of tokens is displayed, if you start getting close to 6k you're probably cutting things fine (it needs the other 2k to respond).

If you do get close to that try reducing the number of days from 7 to 5.

At some point you may have access to `gpt-4-32k` or above and this will no longer be a problem (that should be able to do with a month's worth of Q&A).

# Suggestions

Take time to sincerely stop and answer the questions. If it asks you "What is one thing you can do today to make things more creative?" instead of bashing out an answer, stop and think "Oh hey _what **is** one thing I can do today_" you'll get more out of it.

Beyond that the questions and answers you're giving are being stored. After a while you'll have weeks (and months) worth of Q&As. I've given an example of what you could do with these with the `summary7.js` script but if there's one thing I've learnt it's that gpt-4 is pretty good at spotting patterns in text.

These are 10 suggestions ChatGPT gave me for what could be done with the information, some of these would need to wait for a 32k context window, most of these would probably blow your context window for anything more than a week's worth of data...

### Content Analysis:
* Frequency Analysis: "Which words or phrases appear most frequently in my journal entries this week/month?"
* Sentiment Analysis: "What is the overall sentiment of my entries this week/month? Positive, negative, or neutral?"
* Topic Modeling: "What topics did I discuss most often in my entries this week/month?"
* Entity Recognition: "Did I mention any specific people, places, or things regularly in my entries?"

### Trend Analysis:
* Progression Analysis: "How has the sentiment of my journal changed over the past month/quarter?"
* Topic Evolution: "How have the topics I discussed evolved or changed over time?"
* Pattern Recognition: "Are there any recurring patterns or themes in my entries, perhaps on specific days or in specific weeks?"

### Comparative Analysis:
* "How does this week's sentiment compare to the last week?"
* "Are there topics I focused on more this month compared to the previous month?"
* "Which weeks had the most positive/negative entries?"

### Insight Generation:
* "Based on my past entries, what might be some areas of concern or focus for me in the coming week?"
* "Are there any inconsistencies between my stated goals and my daily reflections?"
* "Can you identify any goals or aspirations I've mentioned multiple times?"

### Temporal Analysis:
* "Were there specific days or times when I journaled more frequently?"
* "Did the length of my journal entries change over time?"
* "Are there specific days of the week when my sentiment is particularly positive or negative?"

### Question Deep Dive:
* "Which questions from the journaling prompts led to the most introspective answers?"
* "Which questions did I seem to struggle with or provide shorter answers to?"

### Feedback Mechanism:
* "Based on my past entries, can you suggest new journaling prompts that might be particularly relevant or insightful for me?"
* "Which prompts have resulted in the most valuable insights over the past month?"

### Associative Analysis:
* "Which topics or themes often appear together in the same entries?"
* "Based on my entries, which emotions or sentiments are most often associated with specific events or individuals?"

### Goal Tracking:
* "Have I mentioned any specific goals or aspirations in my entries? How often do they appear?"
* "Are there any actions or steps associated with these goals in subsequent entries?"

### Recommendation System:
* "Based on the themes and sentiments of my journaling, can you recommend any books, articles, or other resources?"

--- 
This question "_Based on my past entries, can you suggest new journaling prompts that might be particularly relevant or insightful for me?_" would be an interesting exercise in updating the 20 base questions. As would be a question to get some prompts that may explore new areas that you don't often touch.

# Cost

I use Kitty for a bunch of things. But if you're just asking for questions once a day and a summary once a week then the cost should be around $1-$2 per week. If you're doing a lot of debugging or testing that'll obviously go up, keep an eye on your usage here: https://platform.openai.com/account/usage

# Feedback

I won't be accepting pull requests on this repo, it's for demo purposes only. But if you do want to give me feedback you can find me in most places at @revdancatt

I hope you find this useful

😻

# Why is Kitty called Kitty?

Because I use the Kitty terminal: https://sw.kovidgoyal.net/kitty/ for running it, so I can keep the window separate to my normal terminal. I figured I'd just call the AI "Kitty".

Kitty the AI is gender neutral, being an AI Kitty is neither male or female, but most people seem to call Kitty "she/her", whatever works for you is fine.
