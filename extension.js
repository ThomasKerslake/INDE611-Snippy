const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// this method is called when your extension is activated

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "save-a-snip" is now active!');

	let disposable = vscode.commands.registerCommand('extension.saveToSnippy', function() {
		let editor = vscode.window.activeTextEditor;
		let document = editor.document;
		let selection = editor.selection;

		// Get the word within the selection
		let word = document.getText(selection);

		var userName = process.env['USERPROFILE'].split(path.sep)[2];
		var userId = path.join('C:\\Users\\', userName);

		const folderPath = userId + '\\AppData\\Roaming\\Code\\User\\snippets';

		/**
		 * @param {string} codeSnippet
		 * @param {string} prefixTab
		 * @param {string} description
		 */
		function renderSnippet(codeSnippet, prefixTab, description) {
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
			  "${description}": {
				"prefix": "${prefixTab}",
				"body": [
				  ${newSnippet.join('\n')}
				],
				"description": "${description}"
			  },
			`;
		}

		fs.access(path.join(folderPath, 'save-a-snip.code-snippets'), (error) => {
			if (!error) {
				var snipPositon = 2;
				var snipPath = path.join(folderPath, 'save-a-snip.code-snippets');
				var appendSnip = renderSnippet(word, 'word', 'word2');

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
					renderSnippet(word, 'word', 'word2'),
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
	});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
};
