# DMS Software Bot.  A simple conversation bot for Facebook

This project is an example server for Messenger Platform built in Node.js. It was forked from the Facebook example.

With this app, you can build a structued conversation to communicate with your clients. 

You can also see examples of the different types of Structured Messages like buttons, carousel, quick reply, etc. 

It contains the following functionality:

* Webhook (specifically for Messenger Platform events)
* Send API 
* Web Plugins
* Messenger Platform v1.1 features
* Simple Emoji support
* Custom keyword responses
* Structured conversation support

Follow the [walk-through](https://developers.facebook.com/docs/messenger-platform/quickstart) to learn about settting up your own FB robot in more detail.  This project can be used as a substitute for the github project in the tutorial.

## License

See the LICENSE file in the root directory of this source tree. Feel free to use and modify the code.

## Get Started

1. Sign up for you own Github account
2. Fork this project so that you can edit it
3. Review the steps in the Facebook [walk-through] (https://developers.facebook.com/docs/messenger-platform/quickstart) to setup your Page.  Go ahead an do step 1.
4. Sign up for a Heroku account
5. Hit this button to setup the app in Heroku.
 [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/matthewericfisher/fb-robot)
7. Pick a name for your app and remember it
8. In the Facebook console, get the App Secret from the main Settings page.  Add it to the Heroku setup window
9. In the Facebook console, generate the Page Access Token from the Messenger -> Settings tab. Add it to the Heroku setup  window
10. Pick a password as your Validation Token.
11. 'Deploy for Free' in Heroku
12. In the Facebook console, hit +Add Product and pick Webhooks.  The URL will be https://your-bot-name.herokuapp.com/webhook.  'your-bot-name' will be replaced with the Heroku app name that you chose.  Add your Validation Token in the proper field.    Subscribe to  all the message types for delivery.

Thats it. If everything is good, you can open your Page in Messenger and the bot will respond to the 'home' prompt.  The bot will only respond to the Page adminstrator and other people under the 'Roles' page in Facebook.  

To get the bot open to the world you have to go through a review process. It took less than a week for my bot.

## Adding context to your bot
The script.json file will guide the bot to the content.  The script.json associates keywords with filenames under the script directory.  The HOME keyword is associated with script/HOME.json for example.  You can edit the file in Github with the pencil icon.  The keywords and filenames are in capital letters but the user can type in mixed case.

The last line in the file is a URL for the thumbs up button.  The attachements the bot can look at the incoming URL and respond as if something was typed in.  You can get the URL for FB images from the Heroku logs. 

The files in the script directory give you examples of the various widgets that FB allows.  You can copy the files and change the details for your own bot.  The syntax is precise so be careful when making changes.  The missing or trailing comma is the easiest mistake to make.  You can use http://jsonlint.com to validate the json.  

You can make new files in the script directory through Github.  Once you have your new file complete make sure to add the proper keywords to the script.json master file.

##Add images
You have to upload images to the Github project before you can use them,  https://help.github.com/articles/adding-a-file-to-a-repository/

Once the image is uploaded then you can refer to the image in your json files. There are several examples in the project.  The URL has to be exact so be careful on the typing.  You can paste the URL into your browser to see if it is correct. The image should appear if all is well.

## Re-Deploy on Heroku

Once your changes are made and committed on Github, you will need to restart the bot on Heroku.  Go to the 'Deploy' tab in the app dashboard.  Associate the app to your Github project with the Github button, you only need to do this once.  Down at the bottom of the page, hit the 'Deploy' button to restart.  You can 'Enable Automatic Deployment' but hitting the button manually seems a bit quicker for me.  

## Check your bot's logs on heroku (Thanks to Esther Crawford for this bit)

If there's a bug in your code, checking the heroku logs is the best way to figure out what's going wrong. Here's how:

1. Install the heroku toolbelt: https://toolbelt.heroku.com/ These are power tools that let you do a lot more than what Heroku dashboard alone allows.

2. Next, open your preferred terminal app. On OSX the default Terminal app will work fine here.

3. Log in to the heroku toolbelt with the following command:

        heroku login

    If the command heroku isn't found, try restarting your terminal app. Once logged in you should be able to list all of your heroku apps like so:

        heroku apps

    which should give you something like this:

        $ heroku apps
        === My Apps
        your-app

4. Now you can check the logs of your heroku app like so:

        heroku logs -a your-app

    This will give you a dump of your most recent app logs. They will look something like the following. Can you spot the error below?

        2016-05-09T14:08:34.966358+00:00 heroku[slug-compiler]: Slug compilation started
        2016-05-09T14:08:34.966363+00:00 heroku[slug-compiler]: Slug compilation finished
        2016-05-09T14:08:34.946344+00:00 heroku[web.1]: State changed from up to starting
        2016-05-09T14:08:34.945605+00:00 heroku[web.1]: Restarting
        2016-05-09T14:08:37.860802+00:00 heroku[web.1]: Stopping all processes with SIGTERM
        2016-05-09T14:08:39.493078+00:00 heroku[web.1]: Process exited with status 143
        2016-05-09T14:08:41.182450+00:00 heroku[web.1]: Starting process with command `npm start`
        2016-05-09T14:08:45.818995+00:00 app[web.1]:
        2016-05-09T14:08:45.819017+00:00 app[web.1]: > smooch-bot-example@1.0.0 start /app
        2016-05-09T14:08:45.819018+00:00 app[web.1]: > node heroku
        2016-05-09T14:08:45.819019+00:00 app[web.1]:
        2016-05-09T14:08:46.601444+00:00 app[web.1]: module.js:433
        2016-05-09T14:08:46.601454+00:00 app[web.1]:     throw err;
        2016-05-09T14:08:46.601455+00:00 app[web.1]:     ^
        2016-05-09T14:08:46.601456+00:00 app[web.1]:
        2016-05-09T14:08:46.601457+00:00 app[web.1]: SyntaxError: /app/script.json: Unexpected token }
        2016-05-09T14:08:46.601458+00:00 app[web.1]:     at Object.parse (native)
        2016-05-09T14:08:46.601458+00:00 app[web.1]:     at Object.Module._extensions..json (module.js:430:27)
        2016-05-09T14:08:46.601459+00:00 app[web.1]:     at Module.load (module.js:357:32)
        2016-05-09T14:08:46.601460+00:00 app[web.1]:     at Function.Module._load (module.js:314:12)
        2016-05-09T14:08:46.601460+00:00 app[web.1]:     at Module.require (module.js:367:17)
        2016-05-09T14:08:46.601461+00:00 app[web.1]:     at require (internal/module.js:20:19)
        2016-05-09T14:08:46.601462+00:00 app[web.1]:     at Object.<anonymous> (/app/script.js:6:21)
        2016-05-09T14:08:46.601473+00:00 app[web.1]:     at Module._compile (module.js:413:34)
        2016-05-09T14:08:46.601474+00:00 app[web.1]:     at Object.Module._extensions..js (module.js:422:10)
        2016-05-09T14:08:46.601474+00:00 app[web.1]:     at Module.load (module.js:357:32)

    Did you notice the `SyntaxError` part? It looks like there's a problem in my script.json. If I inspect that file in github I'll see that indeed, I have a stray comma at the end if the second to last line.

    

    After I remove that comma and redeploy, everything will return to normal.

## How do I deploy my fixes to Heroku?

Great question! Now that you've found your bug and fixed it, you want to redeploy your app. With Heroku you can trigger a deployment using git. Without going into detail, git is a code versioning system it's where github gets its name. Git is the software, github.com is a separate company that hosts git code repositories. If you're using a Mac you should already have git installed. Although git is a very complex tool, it's worth [learning if you're eager](https://www.atlassian.com/git/tutorials/what-is-git), but for this guide's purposes we'll be using only the most basic concepts of git, `pull`ing changes from a remote github repository, `commit`ing changes, and then `push`ing those changes out to a remote repository.

1. To deploy using git you first have to download a copy of your heroku app's code, like so:

        git clone https://github.com/your-github-username/your-app

    Note that git will prompt you to enter your github credentials.

2. This will create a new git copy of your code in a new folder. You can go into that folder like so:

        cd your-app

3. Now you can use the heroku toolbelt to link this git copy up to your heroku app with the following command:

        heroku git:remote -a your-app

4. Once that's done, you can now deploy to heroku directly from this directory. If you've made any fixes on github directly, be sure to sync them here like so:

        git pull origin master
        git push heroku master

5. You can also make changes to your local copy of the code. To do this, edit whatever file you wish in your preferred text editor, and then commit and push them up to github. You'll add a commit message, which is a short sentence decribing what you changed.

        git commit -a -m 'Your commit message'
        git push origin master

    Then, you can deploy those changes to heroku in the same way:

        git push heroku master

