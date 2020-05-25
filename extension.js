//required modules
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios").default;
const jwtDecode = require("jwt-decode");

axios.defaults.baseURL =
  "https://europe-west1-snippy-929af.cloudfunctions.net/api";
//------------validation-----------------
function checkEmpty(data) {
  if (data === null || data === undefined || data === "") return true;
  else return false;
}

//----------UserloginInputs---------------
function getUserLoginEmail() {
  return vscode.window.showInputBox({
    placeHolder: "Email Address",
    prompt: "Please enter your Snippy account email address. ",
  });
}

function getUserLoginPassword() {
  return vscode.window.showInputBox({
    placeHolder: "Password",
    prompt: "Please enter your account password. ",
    password: true,
  });
}
//----------CreateSnippetPost----------------
function snippetPostTitle() {
  return vscode.window.showInputBox({
    placeHolder: "Example: 'CSS button pack (10 Button designs)",
    prompt: "Enter in a Title for your snippet post. Something concise. ",
  });
}

function snippetPostDescription() {
  return vscode.window.showInputBox({
    placeHolder: "Enter a description for your snippet(s)",
    prompt:
      "What does this snippet(s) do? Why are they useful? What does it help with? How do they help you? ",
  });
}

function snippetPostType() {
  return vscode.window.showQuickPick(
    [
      "Other",
      "Angular",
      "C",
      "C#",
      "C++",
      "CSS",
      "Django",
      "HTML-CSS",
      "Java",
      "JavaScript",
      "jQuery",
      "Nodejs",
      "PHP",
      "Python",
      "Ruby",
      "Objective-C",
      "React",
      "React-Native",
      "SQL",
      "SASS",
      "TypeScript",
      "Unity",
      "Vue",
    ],
    {
      placeHolder: "Select a type that best matches your snippet(s)",
    }
  );
}

//-----CreateLocalSnippetInputs-------------

//Show input box for getting setting a snippets call name
function snippetTabID() {
  return vscode.window.showInputBox({
    placeHolder: "Example: 'htmlTemplate1', '!react-login-component', 'Axs'...",
    prompt:
      "Name Your Snippet. This will be used by intellisense to identify this Snippet. ",
  });
}
//Show input box for setting up a description of what the snippet does
function snippetDescription() {
  return vscode.window.showInputBox({
    placeHolder: "Example: This Snippet does this... and that...",
    prompt:
      "What does this Snippet do? Use this to explain the snippets functionality. Helpfull for if you ever forget what it does! ",
  });
}
//Show pickable list for if the user wants the snippet to be accessable globaly (any file type)
function globalSaveStatus() {
  return vscode.window.showQuickPick(["No", "Yes"], {
    placeHolder:
      "Do You Want to Save Globally? (Snippet will be accessible in any file type)",
  });
}

//------CreatingMarkupOfSnippet------------
/**
 * @param {string} codeSnippet
 * @param {string} tabID
 * @param {string} description
 * @param {string} codeScope
 */
function composeSnippet(codeSnippet, tabID, description, codeScope) {
  //sanitation for replacing or removing possible issues when saving the code to its json format
  //Fist set to string, replace tab spaces, replace carriage returns ...
  const sanitisedSnippet = codeSnippet
    .toString()
    .replace(/\t/g, "")
    .replace(/\r/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\\\$")
    .split("\n");
  const sanitisedSnippetLength = sanitisedSnippet.length;

  // add quotes around each line -> when index === snip length -1 -> add just "" around 'line' as its the last line
  // else ':' add "", around 'line'
  const /**
     * @param {any} line
     * @param {number} index
     */
    newSnippet = sanitisedSnippet.map((line, index) => {
      return index === sanitisedSnippetLength - 1 ? `"${line}"` : `"${line}",`;
    });

  // prettier-ignore
  return`
	"${tabID}": {
		"prefix": "${tabID}",
		"body": [
				${newSnippet.join('\n')}
		],
		"description": "${description}",
		"scope": "${codeScope}"
		},
`;
}
//--------writingSnippetToLocal--------------
async function writeSnippetLocal() {
  let editor = vscode.window.activeTextEditor;
  let document = editor.document;
  let selection = editor.selection;
  var snippetName, snippetInfo, snippetScope, uniqueOsPath;
  // Get the highlighted code (selection)
  var highlightedCode = document.getText(selection);
  // Switch to check for os and alternate paths to the snippets directory dependant on OS
  var platform = os.platform();
  switch (platform) {
    case "darwin":
      uniqueOsPath = "/.config/Code/User/snippets";
      break;
    case "linux":
      uniqueOsPath = "/Library/Application Support/Code/User/snippets";
      break;
    case "win32":
      uniqueOsPath = "\\AppData\\Roaming\\Code\\User\\snippets";
      break;
    //If cant resolve an OS path, alert user
    default:
      vscode.window.showErrorMessage(
        "Snippy does not recognise your OS / Snippets path!"
      );
  }
  const folderPath = path.join(os.homedir(), uniqueOsPath);

  snippetName = await snippetTabID();
  snippetInfo = await snippetDescription();
  snippetScope = await globalSaveStatus();
  //Checking for empty values to cancel / return out the function
  if (
    checkEmpty(snippetName) ||
    checkEmpty(snippetInfo) ||
    checkEmpty(snippetScope)
  ) {
    return vscode.window.showErrorMessage("Exited / no empty fields");
  }
  //By setting snippet scope to empty, the snippet is accessable in any file
  if (snippetScope === "Yes") {
    snippetScope = "";
  } else {
    //This will limit the snippet to only be usable / visable within files of the same language id
    snippetScope = document.languageId;
  }
  fs.access(path.join(folderPath, "snippy.code-snippets"), (error) => {
    if (!error) {
      //Position to put into file
      var snipPositon = 2;
      //Path to file
      var snipPath = path.join(folderPath, "snippy.code-snippets");
      //Snippet to add to file
      var appendSnip = composeSnippet(
        highlightedCode,
        snippetName,
        snippetInfo,
        snippetScope
      );

      fs.readFile(snipPath, function newSnipp(err, data) {
        if (err) {
          throw err;
        }
        //contents of file
        var snipFileContent = data.toString();
        snipFileContent = snipFileContent.substring(snipPositon);
        // 'r+' -> Open file for read / write
        var snipFile = fs.openSync(snipPath, "r+");
        //new snippet + file contents
        var bufferedText = new Buffer(appendSnip + snipFileContent);
        //Write snippet to file
        fs.writeSync(
          snipFile,
          bufferedText,
          0,
          bufferedText.length,
          snipPositon
        );
      });
      vscode.window.showInformationMessage("Saved your Snippet!");
    } else {
      //If there is no 'snippet.code-snippets' file in the directory, create one
      var newFileCreation;
      newFileCreation = composeSnippet(
        highlightedCode,
        snippetName,
        snippetInfo,
        snippetScope
      );
      //As this is the files inital creation, the first snippet needs to be wrapped in '{}'
      //to be correctly saved to its json format - future snippets will be simply added into this '{}'
      fs.writeFile(
        path.join(folderPath, "snippy.code-snippets"),
        `{ ${newFileCreation} }`,
        (err) => {
          if (err) {
            console.error(err);
            return vscode.window.showErrorMessage(
              "Failed to create snippet file!"
            );
          }
          vscode.window.showInformationMessage(
            "Created your new snippet file and added your code snippet!"
          );
        }
      );
    }
  });
}
// Upon specific activation, the corresponding function is called
// Login and logout functionality setup in the active function to access context.globalState for storing user tokens
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  //---------TokenTimeoutCheck--------------
  //Checking for local user token from a logged in user
  const checkUserToken = context.globalState.get("userTokenId");
  if (checkUserToken && checkUserToken !== undefined) {
    const decodedUserToken = jwtDecode(checkUserToken);
    //Get the user token expire time (which is stored in seconds) * 1000 to convert time from seconds
    //If less than (now) -> expired -> log user out
    if (decodedUserToken.exp * 1000 < Date.now()) {
      userLogout();
    } else {
      axios.defaults.headers.common["Authorization"] = checkUserToken;
    }
  } else {
    userLogout();
  }

  //--------PostingSnippetOnSnippy---------------
  async function postUserSnippet() {
    var snippyTitle, snippyDescription, snippyType;
    if (checkUserToken === undefined) {
      return vscode.window.showErrorMessage(
        "You need to be logged in to be able to post to Snippy (Open context memu -> 'Snippy-- Login')."
      );
    }
    snippyTitle = await snippetPostTitle();
    snippyDescription = await snippetPostDescription();
    snippyType = await snippetPostType();

    //Checking for empty values to cancel / return out the function
    if (
      checkEmpty(snippyTitle) ||
      checkEmpty(snippyDescription) ||
      checkEmpty(snippyType)
    ) {
      return vscode.window.showErrorMessage("Exited / no empty fields");
    }

    let editor = vscode.window.activeTextEditor;
    let document = editor.document;
    let selection = editor.selection;
    // Get the highlighted code (selection)
    var highlightedCode = document.getText(selection);

    const userSnippetPost = {
      snipTitle: snippyTitle,
      snipDescription: snippyDescription,
      body: highlightedCode,
      snipType: snippyType,
    };

    //Used for when a user posts a new code snippet
    function postSnippetAction(newSnippetPost) {
      axios
        .post("/snip", newSnippetPost)
        .then((res) => {
          console.log(res);
          vscode.window.showInformationMessage("Posted to Snippy!");
        })
        .catch((err) => {
          vscode.window.showErrorMessage(
            "An error occurred, make sure you're logged in. Or try logging out and in again."
          );
        });
    }

    postSnippetAction(userSnippetPost);
  }
  //----------UserLogin---------------
  var userPassword, userEmail;
  async function vscodeLoginUser() {
    //Wait for these inputs from the user
    userEmail = await getUserLoginEmail();
    userPassword = await getUserLoginPassword();
    //Data to send as request
    const userInfo = {
      email: userEmail,
      password: userPassword,
    };

    function userLogin(userData) {
      axios
        .post("/login", userData)
        .then((res) => {
          setHeaderForAuthorization(res.data.token);
          console.log(res.data.token);
          vscode.window.showInformationMessage("Successfully logged in!");
        })
        .catch((err) => {
          console.log(err);
          return vscode.window.showErrorMessage(
            "Incorrect Login credentials / error"
          );
        });
    }
    function setHeaderForAuthorization(userToken) {
      //Token created upon user login
      const userTokenId = `Bearer ${userToken}`;
      //Saving it to local storage
      context.globalState.update("userTokenId", userTokenId);
      //Setting the header value for axios
      axios.defaults.headers.common["Authorization"] = userTokenId;
    }
    //Call login, pass user inputted info
    userLogin(userInfo);
  }
  //--------UserLogout-----------
  function userLogout() {
    //Delete local stored user token, delete header from axios
    context.globalState.update("userTokenId", undefined);
    delete axios.defaults.headers.common["Authorization"];
    return vscode.window.showInformationMessage(
      "You have been logged out of Snippy."
    );
  }
  //------RegisteringCommands---------

  //Used to check the extension is running
  console.log('"Snippy" is now active!');

  let saveToSnippyFunction = vscode.commands.registerCommand(
    "extension.saveToSnippy",
    writeSnippetLocal
  );

  let loginToSnippy = vscode.commands.registerCommand(
    "extension.snippyLogin",
    vscodeLoginUser
  );

  let logoutOfSnippy = vscode.commands.registerCommand(
    "extension.snippyLogout",
    userLogout
  );

  let postToSnippy = vscode.commands.registerCommand(
    "extension.snippyPost",
    postUserSnippet
  );
  context.subscriptions.push(
    saveToSnippyFunction,
    loginToSnippy,
    logoutOfSnippy,
    postToSnippy
  );
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
