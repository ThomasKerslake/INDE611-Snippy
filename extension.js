const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

function snippetTabID() {
	return vscode.window.showInputBox({
		placeHolder: 'Name Your Snippet, Example: htmlTemplateOne, window-resize, !flex-setup...'
	});
}

function snippetDescription() {
	return vscode.window.showInputBox({
		placeHolder: 'Description: What Does This Snippet Do?'
	});
}

function globalSaveStatus() {
	return vscode.window.showQuickPick([ 'No', 'Yes' ], {
		placeHolder: 'Do You Want to Save Globally? (Snippet will be visible in any file)'
	});
}

/**
* @param {string} codeSnippet
* @param {string} tabID
* @param {string} description
* @param {string} codeScope
*/
function renderSnippet(codeSnippet, tabID, description, codeScope) {
	const separatedSnippet = codeSnippet
		.toString()
		.replace(/\t/g, '')
		.replace(/^\s+|\s+$/g, '')
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\$/g, '\\\\$')
		.split('\r\n');
	const separatedSnippetLength = separatedSnippet.length;

	// add quotes around each line - Stop at final line and end with ','
	const /**
	* @param {any} line
	* @param {number} index
	*/
	newSnippet = separatedSnippet.map((line, index) => {
		return index === separatedSnippetLength - 1 ? `"${line}"` : `"${line}",`;
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

async function writeSnippetLocal() {
	let editor = vscode.window.activeTextEditor;
	let document = editor.document;
	let selection = editor.selection;
	var snippetName, snippetInfo, snippetScope, uniqueOsPath;
	// Get the highlighted code (selection)
	var highlightedCode = document.getText(selection);
	//console.log(os.homedir());
	//var userName = process.env['USERPROFILE'].split(path.sep)[2];
	//var userId = path.join('C:\\Users\\', userName);
	var platform = os.platform();
	switch (platform) {
		case 'darwin':
			uniqueOsPath = '/.config/Code/User/snippets';
			break;
		case 'linux':
			uniqueOsPath = '/Library/Application Support/Code/User/snippets';
			break;
		case 'win32':
			uniqueOsPath = '\\AppData\\Roaming\\Code\\User\\snippets';
			break;
		default:
			vscode.window.showErrorMessage('Snippy does not recognise your OS / Snippets path!');
	}
	const folderPath = path.join(os.homedir(), uniqueOsPath);
	//console.log(folderPath);
	//console.log(path.resolve('save-a-snip.code-snippets'));

	snippetName = await snippetTabID();
	snippetInfo = await snippetDescription();
	snippetScope = await globalSaveStatus();
	if (snippetScope === 'Yes') {
		snippetScope = '';
	} else {
		snippetScope = document.languageId;
	}
	fs.access(path.join(folderPath, 'save-a-snip.code-snippets'), (error) => {
		if (!error) {
			var snipPositon = 2;
			var snipPath = path.join(folderPath, 'save-a-snip.code-snippets');
			var appendSnip = renderSnippet(highlightedCode, snippetName, snippetInfo, snippetScope);

			fs.readFile(snipPath, function newSnipp(err, data) {
				if (err) {
					throw err;
				}
				var snipFileContent = data.toString();
				snipFileContent = snipFileContent.substring(snipPositon);
				var snipFile = fs.openSync(snipPath, 'r+');
				var bufferedText = new Buffer(appendSnip + snipFileContent);
				fs.writeSync(snipFile, bufferedText, 0, bufferedText.length, snipPositon);
			});

			vscode.window.showInformationMessage('Saved your Snipp!');
		} else {
			fs.writeFile(
				path.join(folderPath, 'save-a-snip.code-snippets'),
				renderSnippet(highlightedCode, snippetName, snippetInfo, snippetScope),
				(err) => {
					if (err) {
						console.error(err);
						return vscode.window.showErrorMessage('Failed to create snipFile.');
					}
					vscode.window.showInformationMessage('Created new snipFile and added your code snip!');
				}
			);
		}
	});
}

// this method is called when your extension is activated

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "Snippy" is now active!');

	let disposable = vscode.commands.registerCommand('extension.saveToSnippy', writeSnippetLocal);

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
};
